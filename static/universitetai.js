// Prevent multiple simultaneous operations
let isLoading = false;
let isEditing = false;

// Get the base URL for all requests
const baseUrl = window.location.origin;

// Format a date string from database format to YYYY/MM/DD
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  // Try to format the date consistently
  try {
    // If the date already has slashes, leave it as is
    if (dateStr.includes('/')) {
      return dateStr;
    }
    
    // If the date has dashes, replace them with slashes
    if (dateStr.includes('-')) {
      return dateStr.replace(/-/g, '/');
    }
    
    // If it's another format, try to parse and format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }
  } catch (err) {
    console.warn('Date formatting error:', err);
  }
  
  // Return original if we can't format it
  return dateStr;
}

// Main function to load table data
async function loadTable() {
  if (isLoading) {
    console.log('Already loading, please wait...');
    return;
  }
  
  isLoading = true;
  console.log('Loading table data...');
  
  // Show loading message
  const table = document.getElementById("table");
  const loadingMsg = document.createElement('div');
  loadingMsg.id = 'loading-message';
  loadingMsg.textContent = 'Įkeliami duomenys...';
  loadingMsg.style.color = '#3498db';
  loadingMsg.style.margin = '20px 0';
  loadingMsg.style.textAlign = 'center';
  loadingMsg.style.fontWeight = 'bold';
  
  if (table.parentNode) {
    table.parentNode.insertBefore(loadingMsg, table);
  }
  
  try {
    // Fetch data with cache busting
    const response = await fetch(`${baseUrl}/universitetai/data`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Loaded ${data.length} rows`);
    
    // Create table header
    table.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Pavadinimas</th>
        <th>Šalis</th>
        <th>Miestas</th>
        <th>Įkurimo data</th>
        <th>Studentų</th>
        <th>Darbuotojų</th>
        <th>Fakultetų</th>
        <th>Veiksmai</th>
      </tr>`;
    
    // Handle empty data
    if (!data || data.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 9;
      emptyCell.textContent = 'Nėra duomenų';
      emptyCell.style.textAlign = 'center';
      emptyCell.style.padding = '20px';
      emptyRow.appendChild(emptyCell);
      table.appendChild(emptyRow);
    } else {
      // Populate table with data
      data.forEach(row => {
        const tr = document.createElement("tr");
        const id = row[0]; // Store ID for actions
        
        // Add data cells
        row.forEach((cell, index) => {
          const td = document.createElement("td");
          
          // Format date (assuming date is in the 5th column - index 4)
          if (index === 4 && cell) {
            td.textContent = formatDate(cell);
          } else {
            td.textContent = cell !== null ? cell : '';
          }
          
          tr.appendChild(td);
        });
        
        // Add action buttons
        const actionsTd = document.createElement("td");
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "Redaguoti";
        editBtn.className = "action-btn btn-edit";
        editBtn.onclick = () => editRow(tr, row);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Ištrinti";
        deleteBtn.className = "action-btn btn-delete";
        deleteBtn.onclick = () => deleteRow(id);
        
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);
        
        table.appendChild(tr);
      });
    }
  } catch (error) {
    console.error('Error loading table:', error);
    
    // Show error in table
    table.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Pavadinimas</th>
        <th>Šalis</th>
        <th>Miestas</th>
        <th>Įkurimo data</th>
        <th>Studentų</th>
        <th>Darbuotojų</th>
        <th>Fakultetų</th>
        <th>Veiksmai</th>
      </tr>
      <tr>
        <td colspan="9" style="text-align: center; color: #e74c3c; padding: 20px;">
          <b>Klaida įkeliant duomenis:</b> ${error.message}
        </td>
      </tr>`;
  } finally {
    // Remove loading message
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) loadingElement.remove();
    
    isLoading = false;
    isEditing = false;
  }
}

// Function to handle row deletion
async function deleteRow(id) {
  if (isLoading || isEditing) {
    alert('Prašome palaukti, kol baigsis dabartinė operacija.');
    return;
  }
  
  if (!confirm(`Ar tikrai norite ištrinti universitetą su ID ${id}?`)) {
    return;
  }
  
  isLoading = true;
  console.log(`Deleting university with ID: ${id}`);
  
  try {
    const response = await fetch(`${baseUrl}/universitetai/delete/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `Klaida: ${response.status}`);
    }
    
    alert(result.message || 'Ištrinta sėkmingai');
    // Reload the entire page to show fresh data
    window.location.reload();
  } catch (error) {
    console.error('Error deleting row:', error);
    alert(`Klaida trinant įrašą: ${error.message}`);
    isLoading = false;
  }
}

// Function to prepare a row for editing
function editRow(tr, rowData) {
  if (isLoading || isEditing) {
    alert('Prašome palaukti, kol baigsis dabartinė operacija.');
    return;
  }
  
  isEditing = true;
  const id = rowData[0];
  console.log(`Editing university with ID: ${id}`, rowData);
  
  // Highlight the row being edited
  tr.style.backgroundColor = '#f8f9fa';
  tr.style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.3)';
  
  const cells = tr.cells;
  const fieldNames = [
    'pavadinimas', 'salis', 'miestas', 'ikurimo_data', 
    'studentu_skaicius', 'darbuotoju_skaicius', 'fakultetu_skaicius'
  ];
  
  // Transform cells into input fields
  for (let i = 1; i < cells.length - 1; i++) {
    const cell = cells[i];
    const originalValue = cell.textContent;
    const fieldIndex = i - 1;
    const fieldName = fieldNames[fieldIndex];
    
    // Special handling for the date field
    if (fieldName === 'ikurimo_data') {
      // Convert YYYY/MM/DD to YYYY-MM-DD for the date input
      let dateValue = originalValue;
      if (dateValue && dateValue.includes('/')) {
        dateValue = dateValue.replace(/\//g, '-');
      }
      
      cell.innerHTML = `
        <input 
          type="date" 
          value="${dateValue}" 
          data-original="${originalValue}" 
          data-field="${fieldName}"
        >
        <span class="format-hint">Format: YYYY/MM/DD</span>
      `;
    } else {
      cell.innerHTML = `
        <input 
          type="text" 
          value="${originalValue}" 
          data-original="${originalValue}" 
          data-field="${fieldName}"
        >`;
    }
  }
  
  // Replace action buttons with save/cancel
  const actionCell = cells[cells.length - 1];
  actionCell.innerHTML = '';
  
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Išsaugoti";
  saveBtn.className = "action-btn btn btn-edit";
  saveBtn.style.backgroundColor = "#2ecc71";
  saveBtn.onclick = () => saveRow(tr, id);
  
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Atšaukti";
  cancelBtn.className = "action-btn btn";
  cancelBtn.style.backgroundColor = "#95a5a6";
  cancelBtn.style.color = "white";
  cancelBtn.onclick = () => {
    isEditing = false;
    loadTable();
  };
  
  actionCell.appendChild(saveBtn);
  actionCell.appendChild(cancelBtn);
}

// Function to save edited row
async function saveRow(tr, id) {
  if (isLoading) {
    alert('Prašome palaukti, kol baigsis dabartinė operacija.');
    return;
  }
  
  isLoading = true;
  console.log(`Saving university with ID: ${id}`);
  
  try {
    // Valid field names that exist in the database
    const validFields = [
      'pavadinimas', 'salis', 'miestas', 'ikurimo_data', 
      'studentu_skaicius', 'darbuotoju_skaicius', 'fakultetu_skaicius'
    ];
    
    // Collect changed fields
    const inputs = tr.querySelectorAll('input');
    const changes = {};
    let hasChanges = false;
    
    inputs.forEach(input => {
      const fieldName = input.getAttribute('data-field');
      const originalValue = input.getAttribute('data-original');
      let newValue = input.value.trim();
      
      // Format date in YYYY/MM/DD if needed
      if (fieldName === 'ikurimo_data' && newValue) {
        newValue = newValue.replace(/-/g, '/');
      }
      
      console.log(`Field ${fieldName}: original='${originalValue}', new='${newValue}'`);
      
      // Only include valid field names that have changed
      if (validFields.includes(fieldName) && newValue !== originalValue) {
        console.log(`Field ${fieldName} changed from '${originalValue}' to '${newValue}'`);
        changes[fieldName] = newValue;
        hasChanges = true;
      }
    });
    
    // Check if there are changes
    if (!hasChanges) {
      alert('Nėra pakeitimų');
      isLoading = false;
      isEditing = false;
      loadTable();
      return;
    }
    
    console.log('Changes to save:', changes);
    
    // Send update request
    const updateUrl = `${baseUrl}/universitetai/update/${id}`;
    console.log('Update URL:', updateUrl);
    
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(changes)
    });
    
    console.log('Response status:', response.status);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server neįformino atsakymo JSON formatu');
    }
    
    const result = await response.json();
    console.log('Server response:', result);
    
    if (!response.ok) {
      throw new Error(result.message || `Klaida: ${response.status}`);
    }
    
    alert(result.message || 'Atnaujinta sėkmingai');
    // Reload the entire page to show fresh data
    window.location.reload();
  } catch (error) {
    console.error('Error saving row:', error);
    alert(`Klaida atnaujinant įrašą: ${error.message}`);
    isLoading = false;
    isEditing = false;
  }
}

// Initialize the table when DOM is loaded
document.addEventListener('DOMContentLoaded', loadTable);
