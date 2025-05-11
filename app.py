from flask import Flask, render_template, request, jsonify, redirect, url_for
from db_config import get_connection
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import logging

app = Flask(__name__)
# Configure CORS to allow all methods and headers
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Handle preflight requests for all routes
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 204

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/universitetai')
def universitetai():
    return render_template('universitetai.html')

@app.route('/ataskaita')
def ataskaita():
    try:
        # Get filter parameters from request
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        hours_from = request.args.get('hours_from')
        hours_to = request.args.get('hours_to')
        search_text = request.args.get('search_text')
        sort_order = request.args.get('sort_order')
        row_limit = request.args.get('row_limit')

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Build filter conditions
        conditions = []
        params = []
        
        if date_from:
            conditions.append("atlyginimai.ismokejimo_data >= %s")
            params.append(date_from)
        
        if date_to:
            conditions.append("atlyginimai.ismokejimo_data <= %s")
            params.append(date_to)
        
        if hours_from:
            conditions.append("atlyginimai.darbo_valandos >= %s")
            params.append(hours_from)
            
        if hours_to:
            conditions.append("atlyginimai.darbo_valandos <= %s")
            params.append(hours_to)
            
        if search_text:
            conditions.append("padaliniai.pavadinimas LIKE %s")
            params.append('%' + search_text + '%')

        # Construct the WHERE clause
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Construct the ORDER BY clause if sorting is requested
        order_clause = ""
        if sort_order:
            order_direction = "ASC" if sort_order == 'asc' else "DESC"
            order_clause = f" ORDER BY row_type ASC, CAST(bruto_valandinis_atlyginimas AS DECIMAL) {order_direction}"
        else:
            order_clause = " ORDER BY row_type ASC"
        # Construct the LIMIT clause if row limiting is requested
        limit_clause = ""
        if row_limit and row_limit.isdigit() and int(row_limit) > 0:
            limit_clause = f" LIMIT {int(row_limit)}"
        
        # Build the final combined query using UNION ALL
        # First part: actual data rows with appropriate filters, sorting, and limiting
        # Second part: aggregated statistics with same filters but no sorting or limiting
        query = f"""
            WITH filtered_data AS (
                SELECT 
                    darbuotojai.vardas, 
                    darbuotojai.pavarde, 
                    padaliniai.pavadinimas, 
                    atlyginimai.bruto_valandinis_atlyginimas, 
                    atlyginimai.ismokejimo_data, 
                    atlyginimai.priedai, 
                    atlyginimai.darbo_valandos,
                    0 as row_type
                FROM darbuotojai 
                LEFT JOIN darbuotojai_padaliniai 
                    ON darbuotojai.id_darbuotojas = darbuotojai_padaliniai.fk_padalinio_darbuotojas 
                LEFT JOIN padaliniai 
                    ON padaliniai.id_padalinys = darbuotojai_padaliniai.fk_darbuotojo_padalinys 
                LEFT JOIN atlyginimai 
                    ON atlyginimai.fk_atlyginimo_darbuotojas = darbuotojai.id_darbuotojas
                {where_clause}
                {order_clause}
                {limit_clause}
            )
            
            SELECT * FROM (
                SELECT 
                    vardas, 
                    pavarde, 
                    pavadinimas, 
                    bruto_valandinis_atlyginimas, 
                    ismokejimo_data, 
                    priedai, 
                    darbo_valandos,
                    row_type
                FROM filtered_data
                
                
                UNION ALL
                
                SELECT 
                    '' as vardas,
                    '' as pavarde,
                    '' as pavadinimas,
                    '' as bruto_valandinis_atlyginimas,
                    '' as ismokejimo_data,
                    '' as priedai,
                    '' as darbo_valandos,
                    1 as row_type
                
                UNION ALL
                
                SELECT 
                    'Iš viso' as vardas,
                    '' as pavarde,
                    '' as pavadinimas,
                    CAST(SUM(bruto_valandinis_atlyginimas) AS CHAR) as bruto_valandinis_atlyginimas,
                    '' as ismokejimo_data,
                    CAST(SUM(priedai) AS CHAR) as priedai,
                    CAST(SUM(darbo_valandos) AS CHAR) as darbo_valandos,
                    2 as row_type
                FROM filtered_data
                
                UNION ALL

                SELECT 
                    'Vidurkiai' as vardas,
                    '' as pavarde,
                    '' as pavadinimas,
                    CAST(FORMAT(AVG(bruto_valandinis_atlyginimas),2) AS CHAR) as bruto_valandinis_atlyginimas,
                    '' as ismokejimo_data,
                    CAST(FORMAT(AVG(priedai),2) AS CHAR) as priedai,
                    CAST(FORMAT(AVG(darbo_valandos),2) AS CHAR) as darbo_valandos,
                    3 as row_type
                FROM filtered_data
                
                UNION ALL
                
                SELECT 
                    'Maksimalus' as vardas,
                    '' as pavarde,
                    '' as pavadinimas,
                    CAST(MAX(bruto_valandinis_atlyginimas) AS CHAR) as bruto_valandinis_atlyginimas,
                    '' as ismokejimo_data,
                    CAST(MAX(priedai) AS CHAR) as priedai,
                    CAST(MAX(darbo_valandos) AS CHAR) as darbo_valandos,
                    4 as row_type
                FROM filtered_data
                
                UNION ALL
                
                SELECT 
                    'Minimalus' as vardas,
                    '' as pavarde,
                    '' as pavadinimas,
                    CAST(MIN(bruto_valandinis_atlyginimas) AS CHAR) as bruto_valandinis_atlyginimas,
                    '' as ismokejimo_data,
                    CAST(MIN(priedai) AS CHAR) as priedai,
                    CAST(MIN(darbo_valandos) AS CHAR) as darbo_valandos,
                    5 as row_type
                FROM filtered_data
            ) AS result_set
            {order_clause}
        """        # Execute the combined query
        cursor.execute(query, params)
        data = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return render_template('ataskaita.html', data=data, date_from=date_from, date_to=date_to, 
                              hours_from=hours_from, hours_to=hours_to, search_text=search_text,
                              sort_order=sort_order, row_limit=row_limit)
    except Error as e:
        logger.error(f"Error fetching ataskaita data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/universitetai/data')
def get_universitetai_data():
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        # Get column names
        cursor.execute("SHOW COLUMNS FROM universitetai")
        columns = [column[0] for column in cursor.fetchall()]
        
        # Get data
        cursor.execute("SELECT * FROM universitetai")
        data = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify(data)
    except Error as e:
        logger.error(f"Error fetching universitetai data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/universitetai/add', methods=['GET', 'POST'])
def add_universitetas():
    if request.method == 'GET':
        return render_template('add_universitetas.html')
    else:
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            connection = get_connection()
            cursor = connection.cursor()
            
            # Insert new record
            cursor.execute("""
                INSERT INTO universitetai (pavadinimas, salis, miestas, ikurimo_data, 
                studentu_skaicius, darbuotoju_skaicius, fakultetu_skaicius)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                data['pavadinimas'],
                data['salis'],
                data['miestas'],
                data['ikurimo_data'],
                data['studentu_skaicius'],
                data['darbuotoju_skaicius'],
                data['fakultetu_skaicius']
            ))
            
            connection.commit()
            last_id = cursor.lastrowid
            
            cursor.close()
            connection.close()
            
            return jsonify({
                "message": f"Universitetas pridėtas sėkmingai su ID: {last_id}",
                "id": last_id
            })
        except Error as e:
            logger.error(f"Error adding universitetas: {e}")
            return jsonify({"error": str(e)}), 500

@app.route('/universitetai/delete/<int:id>', methods=['DELETE'])
def delete_universitetas(id):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        cursor.execute("DELETE FROM universitetai WHERE id = %s", (id,))
        connection.commit()
        
        affected_rows = cursor.rowcount
        
        cursor.close()
        connection.close()
        
        if affected_rows == 0:
            return jsonify({"error": "Įrašas nerastas"}), 404
        
        return jsonify({"message": "Ištrinta sėkmingai"})
    except Error as e:
        logger.error(f"Error deleting universitetas: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/universitetai/update/<int:id>', methods=['PUT'])
def update_universitetas(id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate field names
        valid_fields = {
            'pavadinimas', 'salis', 'miestas', 'ikurimo_data',
            'studentu_skaicius', 'darbuotoju_skaicius', 'fakultetu_skaicius'
        }
        
        invalid_fields = set(data.keys()) - valid_fields
        if invalid_fields:
            return jsonify({"error": f"Invalid fields: {', '.join(invalid_fields)}"}), 400
        
        connection = get_connection()
        cursor = connection.cursor()
        
        # Build update query dynamically
        update_fields = []
        values = []
        for field, value in data.items():
            update_fields.append(f"{field} = %s")
            values.append(value)
        
        values.append(id)  # Add id for WHERE clause
        
        query = f"""
            UPDATE universitetai 
            SET {', '.join(update_fields)}
            WHERE id = %s
        """
        
        cursor.execute(query, values)
        connection.commit()
        
        affected_rows = cursor.rowcount
        
        cursor.close()
        connection.close()
        
        if affected_rows == 0:
            return jsonify({"error": "Įrašas nerastas"}), 404
        
        return jsonify({"message": "Atnaujinta sėkmingai"})
    except Error as e:
        logger.error(f"Error updating universitetas: {e}")
        return jsonify({"error": str(e)}), 500

# Forma F2 routes
@app.route('/forma-f2')
def forma_f2():
    return render_template('forma_f2.html')

@app.route('/forma-f2/padaliniai')
def get_padaliniai():
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                id_padalinys,
                pavadinimas
            FROM padaliniai
            ORDER BY pavadinimas
        """)
        
        data = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify(data)
    except Error as e:
        logger.error(f"Error fetching padaliniai: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/forma-f2/destytojai')
def get_destytojai():
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                id_darbuotojas,
                vardas,
                pavarde,
                pareigos
            FROM darbuotojai
            ORDER BY vardas, pavarde
        """)
        
        data = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify(data)
    except Error as e:
        logger.error(f"Error fetching destytojai: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/forma-f2/add', methods=['GET', 'POST'])
def add_modulis():
    if request.method == 'GET':
        return render_template('add_modulis.html')
    else:
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['pavadinimas', 'kreditu_skaicius', 'modulio_kodas', 'fk_modulio_padalinys']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"Privalomas laukas: {field}"}), 400
            
            connection = get_connection()
            cursor = connection.cursor()
            
            try:
                # Start transaction
                connection.start_transaction()
                
                # Insert into studiju_moduliai
                cursor.execute("""
                    INSERT INTO studiju_moduliai (
                        pavadinimas, kreditu_skaicius, modulio_kodas, fk_modulio_padalinys
                    ) VALUES (%s, %s, %s, %s)
                """, (
                    data['pavadinimas'],
                    data['kreditu_skaicius'],
                    data['modulio_kodas'],
                    data['fk_modulio_padalinys']
                ))
                
                # Get the auto-generated ID
                modulio_id = cursor.lastrowid
                
                # If teachers were selected, insert into destytojai_moduliai with hours
                if 'destytojai' in data and data['destytojai']:
                    for destytojas in data['destytojai']:
                        cursor.execute("""
                            INSERT INTO destytojai_moduliai 
                            (fk_destytojo_studiju_modulis, fk_modulio_destytojas, valandu_kiekis)
                            VALUES (%s, %s, %s)
                        """, (
                            modulio_id,
                            destytojas['id'],
                            destytojas.get('valandu_kiekis')
                        ))
                
                # Commit transaction
                connection.commit()
                return jsonify({"message": "Modulis sėkmingai pridėtas"})
                
            except Error as e:
                # Rollback transaction on error
                connection.rollback()
                raise e
                
            finally:
                cursor.close()
                connection.close()
                
        except Error as e:
            logger.error(f"Error adding modulis: {e}")
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            logger.error(f"Unexpected error adding modulis: {e}")
            return jsonify({"error": "Vidinė serverio klaida"}), 500

@app.route('/forma-f2/delete/<int:id>', methods=['DELETE'])
def delete_modulis(id):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        # Start transaction
        cursor.execute("START TRANSACTION")
        
        try:
            # First delete from destytojai_moduliai
            cursor.execute("""
                DELETE FROM destytojai_moduliai 
                WHERE fk_destytojo_studiju_modulis = %s
            """, (id,))
            
            # Then delete from studiju_moduliai
            cursor.execute("""
                DELETE FROM studiju_moduliai 
                WHERE id_studiju_modulis = %s
            """, (id,))
            
            # Commit transaction
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({"message": "Modulis sėkmingai ištrintas"})
            
        except Error as e:
            # Rollback transaction on error
            connection.rollback()
            cursor.close()
            connection.close()
            raise e
            
    except Error as e:
        logger.error(f"Error deleting modulis: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/forma-f2/update/<int:id>', methods=['PUT'])
def update_modulis(id):
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['pavadinimas', 'kreditu_skaicius', 'modulio_kodas', 'fk_modulio_padalinys']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Privalomas laukas: {field}"}), 400
        
        for datapoint in data:
            if datapoint['kreditu_skaicius'] < 0 or datapoint['kreditu_skaicius'] > 25:
                return jsonify({"error": "Kreditu skaicius turi buti tarp 0 ir 25"}), 400
        connection = get_connection()
        cursor = connection.cursor()
        
        try:
            # Start transaction
            connection.start_transaction()
            
            # Update module
            cursor.execute("""
                UPDATE studiju_moduliai 
                SET pavadinimas = %s,
                    kreditu_skaicius = %s,
                    modulio_kodas = %s,
                    fk_modulio_padalinys = %s
                WHERE id_studiju_modulis = %s
            """, (
                data['pavadinimas'],
                data['kreditu_skaicius'],
                data['modulio_kodas'],
                data['fk_modulio_padalinys'],
                id
            ))
            
            # Delete old teacher relationships
            cursor.execute("""
                DELETE FROM destytojai_moduliai 
                WHERE fk_destytojo_studiju_modulis = %s
            """, (id,))
            
            # Insert new teacher relationships with hours
            if 'destytojai' in data and data['destytojai']:
                for destytojas in data['destytojai']:
                    cursor.execute("""
                        INSERT INTO destytojai_moduliai 
                        (fk_destytojo_studiju_modulis, fk_modulio_destytojas, valandu_kiekis)
                        VALUES (%s, %s, %s)
                    """, (
                        id,
                        destytojas['id'],
                        destytojas.get('valandu_kiekis')
                    ))
            
            # Commit transaction
            connection.commit()
            return jsonify({"message": "Modulis sėkmingai atnaujintas"})
            
        except Error as e:
            # Rollback transaction on error
            connection.rollback()
            raise e
            
        finally:
            cursor.close()
            connection.close()
            
    except Error as e:
        logger.error(f"Error updating modulis: {e}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logger.error(f"Unexpected error updating modulis: {e}")
        return jsonify({"error": "Vidinė serverio klaida"}), 500

@app.route('/forma-f2/data')
def get_moduliai_data():
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get all modules with their departments and teachers
        cursor.execute("""
            SELECT 
                sm.id_studiju_modulis,
                sm.pavadinimas,
                sm.kreditu_skaicius,
                sm.modulio_kodas,
                sm.fk_modulio_padalinys,
                p.id_padalinys,
                p.pavadinimas as padalinys,
                GROUP_CONCAT(
                    CONCAT(
                        d.id_darbuotojas, 
                        ':', 
                        d.vardas, ' ', d.pavarde,
                        ':', 
                        COALESCE(dm.valandu_kiekis, '')
                    )
                    SEPARATOR ';'
                ) as destytojai
            FROM studiju_moduliai sm
            LEFT JOIN padaliniai p ON sm.fk_modulio_padalinys = p.id_padalinys
            LEFT JOIN destytojai_moduliai dm ON sm.id_studiju_modulis = dm.fk_destytojo_studiju_modulis
            LEFT JOIN darbuotojai d ON dm.fk_modulio_destytojas = d.id_darbuotojas
            GROUP BY sm.id_studiju_modulis
            ORDER BY sm.id_studiju_modulis
        """)
        
        data = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Process the data to include teacher IDs and hours
        for row in data:
            if row['destytojai']:
                teachers = []
                for teacher in row['destytojai'].split(';'):
                    if teacher:
                        try:
                            teacher_id, teacher_name, hours = teacher.split(':', 2)
                            teachers.append({
                                'id': int(teacher_id),
                                'name': teacher_name,
                                'valandu_kiekis': hours if hours else None
                            })
                        except ValueError:
                            # Handle case where hours might be missing
                            teacher_id, teacher_name = teacher.split(':', 1)
                            teachers.append({
                                'id': int(teacher_id),
                                'name': teacher_name,
                                'valandu_kiekis': None
                            })
                row['destytojai'] = teachers
            else:
                row['destytojai'] = []
        
        return jsonify(data)
    except Error as e:
        logger.error(f"Error fetching moduliai data: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
