// Track form submission state
let isSubmitting = false;

document.getElementById('uniForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Prevent multiple submissions
  if (isSubmitting) {
    return;
  }
  
  // Show submission in progress
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = 'Siunčiama...';
  submitButton.disabled = true;
  submitButton.style.backgroundColor = '#95a5a6';
  isSubmitting = true;
  
  try {
    // Validate form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Basic validation
    if (!data.pavadinimas || !data.salis || !data.miestas || !data.ikurimo_data) {
      throw new Error('Prašome užpildyti visus privalomus laukus');
    }
    
    // Format date from YYYY-MM-DD to YYYY/MM/DD
    if (data.ikurimo_data) {
      // The date input returns YYYY-MM-DD format, convert to YYYY/MM/DD
      data.ikurimo_data = data.ikurimo_data.replace(/-/g, '/');
    }
    
    // Send data to server
    const res = await fetch('/universitetai/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `Klaida: ${res.status}`);
    }
    
    const result = await res.json();
    alert(result.message || 'Universitetas sėkmingai pridėtas!');
    window.location.href = "/universitetai";
    
  } catch (error) {
    console.error('Error submitting form:', error);
    alert(`Klaida: ${error.message}`);
    
    // Reset button
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
    submitButton.style.backgroundColor = '#2ecc71';
    isSubmitting = false;
  }
});
