from flask import Flask, render_template, request, jsonify, redirect, url_for
from db_config import get_connection
from flask_cors import CORS

app = Flask(__name__)
# Configure CORS to allow all methods and headers
CORS(app, resources={r"/*": {"origins": "*"}})

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

@app.route('/universitetai/data')
def get_universitetai():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM universitetai")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)

@app.route('/universitetai/add')
def add_universitetas_form():
    return render_template('add_universitetas.html')

@app.route('/universitetai/insert', methods=['POST'])
def insert_universitetas():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No JSON data received'}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        
        # The database will auto-increment the ID
        cursor.execute("""
            INSERT INTO universitetai (
                pavadinimas, salis, miestas,
                ikurimo_data, studentu_skaicius, darbuotoju_skaicius, fakultetu_skaicius
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data['pavadinimas'], data['salis'], data['miestas'],
            data['ikurimo_data'], data['studentu_skaicius'], data['darbuotoju_skaicius'], data['fakultetu_skaicius']
        ))
        
        conn.commit()
        
        # Get the last inserted ID for the message
        last_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        return jsonify({'message': f'Universitetas sėkmingai pridėtas! (ID: {last_id})'})
        
    except Exception as e:
        print(f"Error in insert: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@app.route('/universitetai/delete/<id>', methods=['DELETE'])
def delete_universitetas(id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM universitetai WHERE id_universitetas = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Deleted successfully'})

@app.route('/universitetai/update/<id>', methods=['PUT', 'OPTIONS'])
def update_universitetas(id):
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        print(f"Update request received for ID: {id}")
        print(f"Request data: {request.data}")
        print(f"Request content type: {request.content_type}")
        
        # Get the JSON data
        data = request.get_json()
        print(f"Parsed JSON data: {data}")
        
        if not data:
            print("No data received")
            return jsonify({'message': 'No JSON data received'}), 400
        
        # Connect to database
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Get current data
            cursor.execute("SELECT * FROM universitetai WHERE id_universitetas = %s", (id,))
            current_data = cursor.fetchone()
            
            if not current_data:
                print(f"University with ID {id} not found")
                return jsonify({'message': 'University not found'}), 404
                
            # Make sure we only accept valid field names
            valid_fields = [
                'pavadinimas', 'salis', 'miestas', 'ikurimo_data', 
                'studentu_skaicius', 'darbuotoju_skaicius', 'fakultetu_skaicius'
            ]
            
            # Prepare update statement
            update_fields = []
            update_values = []
            
            # Process each field in the request
            for field, value in data.items():
                if field in valid_fields and value and value.strip():
                    # Use backticks to properly escape field names
                    update_fields.append(f"`{field}` = %s")
                    update_values.append(value)
            
            if not update_fields:
                print("No fields to update")
                return jsonify({'message': 'No fields to update'}), 400
                
            # Add ID for the WHERE clause
            update_values.append(id)
            
            # Execute the update
            query = f"UPDATE universitetai SET {', '.join(update_fields)} WHERE id_universitetas = %s"
            print(f"Executing query: {query}")
            print(f"With values: {update_values}")
            
            cursor.execute(query, update_values)
            affected_rows = cursor.rowcount
            print(f"Affected rows: {affected_rows}")
            
            conn.commit()
            
            if affected_rows > 0:
                return jsonify({'message': 'Updated successfully'}), 200
            else:
                return jsonify({'message': 'No changes made'}), 200
        finally:
            # Always close cursor and connection
            if cursor:
                cursor.close()
            if conn:
                conn.close()
                
    except Exception as e:
        print(f"Error in update: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
