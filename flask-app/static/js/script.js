document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recommendForm');
    const resultSection = document.getElementById('result');
    const downloadButton = document.getElementById('download');
    const loginForm = document.getElementById('loginForm');
    const logoutButton = document.getElementById('logout');

    // Handle form submission for recommendations
    if(form){
        document.getElementById('length').value=""
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form submission
    
            // Collect form data and convert values to floats
            const formData = {
                length: parseFloat(document.getElementById('length').value),
                diameter: parseFloat(document.getElementById('diameter').value),
                fos: parseFloat(document.getElementById('fos').value),
                material: document.getElementById('material').value, // Assuming material is a string and doesn't need conversion
                bendingMomentLeft: parseFloat(document.getElementById('bendingMomentLeft').value),
                bendingMomentRight: parseFloat(document.getElementById('bendingMomentRight').value),
                torque: parseFloat(document.getElementById('torque').value),
                fatigueLife: parseFloat(document.getElementById('fatigueLife').value),
                stressMax: parseFloat(document.getElementById('stressMax').value),
                stressMin: parseFloat(document.getElementById('stressMin').value),
                strainMax: parseFloat(document.getElementById('strainMax').value),
                strainMin: parseFloat(document.getElementById('strainMin').value),
                deformationMax: parseFloat(document.getElementById('deformationMax').value),
                deformationMin: parseFloat(document.getElementById('deformationMin').value)
            };
    
            try {
                // Send POST request to the Flask server
                const response = await fetch('http://localhost:5000/recommend', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Include token in the headers
                    },
                    body: JSON.stringify({ features: formData })
                });
    
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
    
                // Prepare for file download
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                // Show the result section and update the download button
                resultSection.classList.remove('d-none');
                downloadButton.onclick = () => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'shaft_model.step'; // Set the name for the downloaded file
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                };
            } catch (error) {
                console.error('There was an error:', error);
                alert('Failed to get a recommendation. Please try again.');
            }
        });
    }


    // Handle login form submission
    if(loginForm){
        document.getElementById("username").value=""
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form submission
    
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
    
            try {
                const response = await fetch('http://localhost:5000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        username: username,
                        password: password
                    })
                });
    
                const data = await response.json();
    
                if (data.success) {
                    sessionStorage.setItem('token', data.token); // Store token in session storage
                    window.location.reload(); // Reload to update UI state
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('There was an error:', error);
                alert('Login failed. Please try again.');
            }
        });
    }

    // Handle logout button click
    if(logoutButton){
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('http://localhost:5000/logout', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Include token in the headers
                    }
                });
    
                if (response.ok) {
                    sessionStorage.removeItem('token'); // Remove token from session storage
                    window.location.reload(); // Reload to update UI state
                } else {
                    alert('Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('There was an error:', error);
                alert('Logout failed. Please try again.');
            }
        });
    }
});