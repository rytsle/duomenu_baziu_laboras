// Get the base URL for all requests
const baseUrl = window.location.origin;

// Prevent multiple simultaneous operations
let isSubmitting = false;

// Fetch departments for dropdown
async function fetchPadaliniai() {
    try {
        const response = await fetch(`${baseUrl}/forma-f2/padaliniai`);
        if (!response.ok) {
            throw new Error('Klaida įkeliant padalinius');
        }
        const data = await response.json();
        
        const select = document.getElementById('fk_modulio_padalinys');
        if (!select) {
            console.error('Select element not found');
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
        const select = document.getElementById('fk_modulio_padalinys');
        if (select) {
            select.innerHTML = '<option value="">Klaida įkeliant padalinius</option>';
        }
    }
}

// Fetch teachers for checkboxes
async function fetchDestytojai() {
    try {
        const response = await fetch(`${baseUrl}/forma-f2/destytojai`);
        if (!response.ok) {
            throw new Error('Klaida įkeliant dėstytojus');
        }
        const data = await response.json();
        
        const container = document.getElementById('destytojai');
        if (!container) {
            console.error('Teachers container not found');
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
            
            const label = document.createElement('label');
            label.htmlFor = `destytojas_${destytojas.id_darbuotojas}`;
            label.textContent = `${destytojas.vardas} ${destytojas.pavarde} (${destytojas.pareigos})`;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        const container = document.getElementById('destytojai');
        if (container) {
            container.innerHTML = `<div class="error-message">Klaida įkeliant dėstytojus: ${error.message}</div>`;
        }
    }
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();
    
    if (isSubmitting) {
        alert('Prašome palaukti, kol baigsis dabartinė operacija');
        return;
    }
    
    isSubmitting = true;
    
    try {
        // Get form values
        const formData = {
            pavadinimas: document.getElementById('pavadinimas').value,
            kreditu_skaicius: document.getElementById('kreditu_skaicius').value,
            modulio_kodas: document.getElementById('modulio_kodas').value,
            fk_modulio_padalinys: document.getElementById('fk_modulio_padalinys').value,
            destytojai: Array.from(document.querySelectorAll('#destytojai input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value)
        };
        
        // Validate required fields
        if (!formData.pavadinimas || !formData.kreditu_skaicius || !formData.modulio_kodas || !formData.fk_modulio_padalinys) {
            throw new Error('Prašome užpildyti visus privalomus laukus');
        }
        
        const response = await fetch(`${baseUrl}/forma-f2/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Klaida išsaugant duomenis');
        }
        
        // Redirect to the main page after successful submission
        window.location.href = '/forma-f2';
    } catch (error) {
        console.error('Error submitting form:', error);
        alert(error.message);
    } finally {
        isSubmitting = false;
    }
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load departments and teachers
    fetchPadaliniai();
    fetchDestytojai();
    
    // Add form submission handler
    const form = document.getElementById('addModulisForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}); 