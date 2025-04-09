// Get the base URL for all requests
const baseUrl = window.location.origin;

// Prevent multiple simultaneous operations
let isSubmitting = false;
let isEditing = false;
let isLoading = false;

// Load table data
async function loadTable() {
    const tbody = document.querySelector('#table tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    // Show loading state
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Įkeliami duomenys...</td></tr>';
    
    try {
        const response = await fetch(`${baseUrl}/forma-f2/data`);
        if (!response.ok) {
            throw new Error('Klaida įkeliant duomenis');
        }
        const data = await response.json();
        
        // Clear loading state
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nėra duomenų</td></tr>';
            return;
        }
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', row.id_studiju_modulis);
            tr.setAttribute('data-padalinys', row.fk_modulio_padalinys);
            tr.setAttribute('data-destytojai', JSON.stringify(row.destytojai));
            
            tr.innerHTML = `
                <td>${row.pavadinimas}</td>
                <td>${row.kreditu_skaicius}</td>
                <td>${row.modulio_kodas}</td>
                <td>${row.padalinys || ''}</td>
                <td>${row.destytojai.map(d => d.name).join(', ') || ''}</td>
                <td>
                    <button class="btn-edit" onclick="editRow(this)">Redaguoti</button>
                    <button class="btn-delete" onclick="deleteRow(this)">Ištrinti</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">${error.message}</td></tr>`;
    }
}

// Fetch departments for dropdown
async function fetchPadaliniai(selectId = 'edit_padalinys') {
    try {
        const response = await fetch(`${baseUrl}/forma-f2/padaliniai`);
        if (!response.ok) {
            throw new Error('Klaida įkeliant padalinius');
        }
        const data = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`Select element with ID ${selectId} not found`);
            return;
        }
        
        select.innerHTML = '<option value="">Pasirinkite padalinį</option>';
        
        data.forEach(padalinys => {
            const option = document.createElement('option');
            option.value = padalinys.id_padalinys;
            option.textContent = padalinys.pavadinimas;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Klaida įkeliant padalinius</option>';
        }
    }
}

// Fetch teachers for checkboxes
async function fetchDestytojai(containerId, selectedTeachers = []) {
    try {
        const response = await fetch(`${baseUrl}/forma-f2/destytojai`);
        if (!response.ok) {
            throw new Error('Klaida įkeliant dėstytojus');
        }
        const data = await response.json();
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID ${containerId} not found`);
            return;
        }
        
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div>Nėra dėstytojų</div>';
            return;
        }
        
        data.forEach(destytojas => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `destytojas_${destytojas.id_darbuotojas}`;
            checkbox.value = destytojas.id_darbuotojas;
            checkbox.name = 'destytojai[]';
            
            // Check if this teacher is selected
            const isSelected = selectedTeachers.some(t => t.id === destytojas.id_darbuotojas);
            if (isSelected) {
                checkbox.checked = true;
            }
            
            const label = document.createElement('label');
            label.htmlFor = `destytojas_${destytojas.id_darbuotojas}`;
            label.textContent = `${destytojas.vardas} ${destytojas.pavarde} (${destytojas.pareigos})`;
            
            // Create hours input (initially hidden)
            const hoursDiv = document.createElement('div');
            hoursDiv.className = 'hours-input';
            hoursDiv.style.display = isSelected ? 'block' : 'none';
            
            const hoursLabel = document.createElement('label');
            hoursLabel.htmlFor = `valandos_${destytojas.id_darbuotojas}`;
            hoursLabel.textContent = 'Valandų skaičius:';
            
            const hoursInput = document.createElement('input');
            hoursInput.type = 'number';
            hoursInput.id = `valandos_${destytojas.id_darbuotojas}`;
            hoursInput.name = `valandos[${destytojas.id_darbuotojas}]`;
            hoursInput.min = '0';
            hoursInput.step = '0.5';
            
            // Set hours value if editing
            if (isSelected) {
                const teacherData = selectedTeachers.find(t => t.id === destytojas.id_darbuotojas);
                if (teacherData && teacherData.valandu_kiekis) {
                    hoursInput.value = teacherData.valandu_kiekis;
                }
            }
            
            hoursDiv.appendChild(hoursLabel);
            hoursDiv.appendChild(hoursInput);
            
            // Add event listener to show/hide hours input
            checkbox.addEventListener('change', function() {
                hoursDiv.style.display = this.checked ? 'block' : 'none';
                if (!this.checked) {
                    hoursInput.value = '';
                }
            });
            
            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(hoursDiv);
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="error-message">Klaida įkeliant dėstytojus: ${error.message}</div>`;
        }
    }
}

// Edit row
async function editRow(button) {
    if (isEditing) {
        alert('Prašome pabaigti dabartinį redagavimą');
        return;
    }
    
    isEditing = true;
    const row = button.closest('tr');
    const cells = row.cells;
    
    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';
    editForm.innerHTML = `
        <div class="form-group">
            <label for="edit_pavadinimas">Pavadinimas</label>
            <input type="text" id="edit_pavadinimas" value="${cells[0].textContent}">
        </div>
        <div class="form-group">
            <label for="edit_kreditu_skaicius">Kreditų skaičius</label>
            <input type="number" id="edit_kreditu_skaicius" value="${cells[1].textContent}">
        </div>
        <div class="form-group">
            <label for="edit_modulio_kodas">Modulio kodas</label>
            <input type="text" id="edit_modulio_kodas" value="${cells[2].textContent}">
        </div>
        <div class="form-group">
            <label for="edit_padalinys">Padalinys</label>
            <select id="edit_padalinys"></select>
        </div>
        <div class="form-group">
            <label>Dėstytojai</label>
            <div id="edit_destytojai" class="checkbox-group"></div>
        </div>
        <div class="button-group">
            <button onclick="saveRow(this)">Išsaugoti</button>
            <button onclick="cancelEdit()">Atšaukti</button>
        </div>
    `;
    
    // Replace row content with edit form
    row.innerHTML = '';
    const td = document.createElement('td');
    td.colSpan = 6;
    td.appendChild(editForm);
    row.appendChild(td);
    
    // Load departments and teachers
    await fetchPadaliniai('edit_padalinys');
    await fetchDestytojai('edit_destytojai', JSON.parse(row.dataset.destytojai));
    
    // Set the selected padalinys
    const padalinysSelect = document.getElementById('edit_padalinys');
    if (padalinysSelect) {
        padalinysSelect.value = row.dataset.padalinys;
    }
}

// Cancel edit
function cancelEdit() {
    isEditing = false;
    isLoading = false;
    loadTable();
}

// Save row
async function saveRow(button) {
    if (isLoading) {
        alert('Prašome palaukti, kol baigsis dabartinė operacija.');
        return;
    }
    
    isLoading = true;
    console.log(`Saving module with ID: ${button.closest('tr').dataset.id}`);
    
    try {
        const tr = button.closest('tr');
        const formData = {
            pavadinimas: document.getElementById('edit_pavadinimas').value,
            kreditu_skaicius: document.getElementById('edit_kreditu_skaicius').value,
            modulio_kodas: document.getElementById('edit_modulio_kodas').value,
            fk_modulio_padalinys: document.getElementById('edit_padalinys').value,
            destytojai: []
        };

        // Get the selected teachers and their hours
        const checkboxes = document.querySelectorAll('#edit_destytojai input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            const teacherId = checkbox.value;
            const hoursInput = document.getElementById(`valandos_${teacherId}`);
            formData.destytojai.push({
                id: teacherId,
                valandu_kiekis: hoursInput ? hoursInput.value : null
            });
        });

        // Check if at least one teacher is assigned
        if (formData.destytojai.length === 0) {
            alert('Turi būti priskirtas bent vienas dėstytojas');
            isLoading = false;
            return;
        }

        // Send update request
        const updateUrl = `${baseUrl}/forma-f2/update/${tr.dataset.id}`;
        console.log('Update URL:', updateUrl);
        
        const response = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
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
        isEditing = false;
        isLoading = false;
        await loadTable();
    } catch (error) {
        console.error('Error saving row:', error);
        alert(`Klaida atnaujinant įrašą: ${error.message}`);
        isLoading = false;
        isEditing = false;
    }
}

// Delete row
async function deleteRow(button) {
    if (!confirm('Ar tikrai norite ištrinti šį įrašą?')) {
        return;
    }
    
    try {
        const row = button.closest('tr');
        const response = await fetch(`${baseUrl}/forma-f2/delete/${row.dataset.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Klaida ištrinant įrašą');
        }
        
        await loadTable();
    } catch (error) {
        console.error('Error deleting row:', error);
        alert(error.message);
    }
}

// Initialize the table when DOM is loaded
document.addEventListener('DOMContentLoaded', loadTable);

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchPadaliniai();
    fetchDestytojai();
}); 