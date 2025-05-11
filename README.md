# University Database Management System

This project is a Flask-based web application designed for managing and reporting on university-related data. It includes modules for handling university information, study modules with associated teachers, and detailed employee salary reports with advanced filtering and aggregation.

## Features

### 1. Main Dashboard (`index.html`)
- Central navigation page linking to all major sections of the application.

### 2. University Management (`universitetai.html`, `add_universitetas.html`)
- **View Universities:** Displays a comprehensive list of universities.
- **CRUD Operations:**
    - **Create:** Add new universities with details such as name, country, city, founding date, student/staff counts, and faculty numbers.
    - **Read:** Fetch and display detailed university information.
    - **Update:** Modify existing university records.
    - **Delete:** Remove universities from the database.
- **API Endpoints:**
    - `GET /universitetai`: Renders the university listing page.
    - `GET /universitetai/data`: Fetches all university data.
    - `GET/POST /universitetai/add`: Displays the form to add a new university and handles its submission.
    - `DELETE /universitetai/delete/<id>`: Deletes a specific university.
    - `PUT /universitetai/update/<id>`: Updates a specific university.

### 3. Study Module Management (Form F2) (`forma_f2.html`, `add_modulis.html`)
- **View Modules:** Lists study modules, including their associated departments and assigned teachers with allocated hours.
- **CRUD Operations:**
    - **Create:** Add new study modules, specifying name, credits, code, department, and assign multiple teachers with their respective teaching hours.
    - **Read:** Fetch and display detailed module information.
    - **Update:** Modify existing module details and teacher assignments.
    - **Delete:** Remove modules and their teacher associations.
- **Dynamic Data:** Fetches department and teacher lists dynamically to populate forms.
- **Transactional Integrity:** Uses database transactions for operations involving modules and teacher assignments to ensure data consistency.
- **API Endpoints:**
    - `GET /forma-f2`: Renders the module listing page.
    - `GET /forma-f2/padaliniai`: Fetches a list of all departments.
    - `GET /forma-f2/destytojai`: Fetches a list of all teachers/employees.
    - `GET /forma-f2/data`: Fetches all module data.
    - `GET/POST /forma-f2/add`: Displays the form to add a new module and handles its submission.
    - `DELETE /forma-f2/delete/<id>`: Deletes a specific module.
    - `PUT /forma-f2/update/<id>`: Updates a specific module.

### 4. Employee Salary Report (`ataskaita.html`)
- **Detailed Reporting:** Displays employee salary information including name, department, gross hourly wage, payment date, bonuses, and work hours.
- **Advanced Filtering:**
    - Payment date range.
    - Work hours range.
    - Department name (text search).
- **Sorting:** Sort data by gross hourly wage (ascending/descending).
- **Row Limiting:** Users can specify the number of rows to display.
- **Aggregate Statistics:**
    - Calculates and displays Sum, Average, Max, and Min values for:
        - Gross Salary
        - Bonuses
        - Work Hours
- **Optimized Querying:** Employs a single SQL query using a Common Table Expression (CTE) and `UNION ALL`. This efficiently fetches both the main dataset (filtered, sorted, limited) and the aggregate statistics, ensuring aggregates are based on the complete filtered set.
- **API Endpoint:**
    - `GET /ataskaita`: Renders the report page and processes data based on user-defined parameters.

## Technologies Used

- **Backend:**
    - Python 3
    - Flask (Web Framework)
    - `mysql-connector-python` (MySQL Database Connector)
    - `flask-cors` (Cross-Origin Resource Sharing)
- **Frontend:**
    - HTML5
    - CSS3
    - JavaScript (Vanilla JS for DOM manipulation and AJAX/Fetch API)
- **Database:**
    - MySQL
- **Templating Engine:**
    - Jinja2 (Flask's default)

## Skills Demonstrated

- **Full-Stack Web Development:** Building and integrating frontend and backend components.
- **Flask Framework:** Expertise in routing, request handling, template rendering, and RESTful API development.
- **Database Management & SQL:**
    - Relational database schema design.
    - Advanced SQL querying: `JOIN`s, filtering, sorting, aggregation, CTEs, `UNION ALL`.
    - CRUD operations.
    - Database transaction management.
- **Frontend Development:**
    - Semantic HTML structuring.
    - CSS for UI styling.
    - JavaScript for dynamic content, AJAX calls, form handling, and client-side validation.
- **API Design & Consumption:** Creating and utilizing RESTful APIs.
- **Data Handling & Reporting:** Implementing complex filtering, sorting, pagination, and aggregate statistics for data presentation.
- **Software Engineering Practices:**
    - Modular project organization.
    - Error handling and logging.
    - Separation of concerns.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    # On Windows
    venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Database Setup:**
    - Ensure you have a MySQL server running.
    - Create a database (e.g., `db_laboras`).
    - Update the database connection details in `db_config.py` if they differ from the defaults:
      ```python
      # db_config.py
      import mysql.connector

      def get_connection():
          return mysql.connector.connect(
              host="localhost",  # Your MySQL host
              user="root",       # Your MySQL username
              password="",       # Your MySQL password
              database="db_laboras", # Your database name
              port=3306          # Your MySQL port
          )
      ```
    - You will need to create the necessary tables and populate them with initial data. The schema can be inferred from the SQL queries within `app.py`.

5.  **Run the application:**
    ```bash
    python app.py
    ```
    The application will typically be available at `http://127.0.0.1:5000/`.

## Project Structure

```
.
├── app.py                  # Main Flask application, routes, and logic
├── db_config.py            # Database connection configuration
├── requirements.txt        # Python dependencies
├── static/                 # Static files (CSS, JavaScript)
│   ├── add_modulis.js
│   ├── add_universitetas.js
│   ├── forma_f2.js
│   └── universitetai.js
└── templates/              # HTML templates (Jinja2)
    ├── add_modulis.html
    ├── add_universitetas.html
    ├── ataskaita.html
    ├── forma_f2.html
    ├── index.html
    └── universitetai.html
```

## Future Enhancements (Optional)
- User authentication and authorization.
- More comprehensive data validation.
- Unit and integration tests.
- Deployment scripts/configurations.
- Enhanced UI/UX with a modern frontend framework.
