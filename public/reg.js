
// Validate email format
function isValidEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// Validate phone number 
function isValidPhone(phone) {
  return /^\d{9,10}$/.test(phone);
}

window.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('registerForm');
  const emailOrPhoneInput = document.getElementById('emailOrPhone');
  const passwordInput = document.getElementById('password');
  const fullNameInput = document.getElementById('fullName');
  const usernameInput = document.getElementById('username');
  const errorBox = document.getElementById('registerError');

  
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorBox.textContent = '';

    const emailOrPhone = emailOrPhoneInput.value.trim();
    const password = passwordInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const username = usernameInput.value.trim();

    // Validation
    if (!emailOrPhone || !password || !fullName || !username) {
      errorBox.textContent = 'יש למלא את כל השדות';
      return;
    }
    let isEmail = isValidEmail(emailOrPhone);
    let isPhone = isValidPhone(emailOrPhone);
    if (!isEmail && !isPhone) {
      errorBox.textContent = 'נא להזין אימייל תקין או מספר טלפון תקין';
      return;
    }

    // Check if username exists 
    try {
      const checkRes = await fetch(`/api/users/search/username?username=${encodeURIComponent(username)}`);
      if (checkRes.ok) {
        // Username exists
        errorBox.textContent = 'שם המשתמש כבר קיים במערכת';
        return;
      }
    } catch (err) {
    }

    // Build request body
    const reqBody = {
      username,
      fullName,
      password
    };
    if (isEmail) {
      reqBody.email = emailOrPhone;
    } else if (isPhone) {
      reqBody.phone = emailOrPhone;
    }

    // Register user 
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Registration error:', data); 
        errorBox.textContent = data.error || JSON.stringify(data) || 'שגיאה בהרשמה';
        return;
      }
      // Registration successful
      window.location.href = '/'; 
    } catch (err) {
      errorBox.textContent = 'שגיאה בהרשמה';
    }
  });
}); 