// function to check if email is valid
function isValidEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

document.addEventListener("DOMContentLoaded", function () {
  const loginBtn       = document.querySelector(".login-submit-btn");
  const emailInput     = document.getElementById("emailInput");  
  const passwordInput  = document.getElementById("passwordInput");
  const emailError     = document.getElementById("emailError");
  const passwordError  = document.getElementById("passwordError");
  const togglePassword = document.getElementById("togglePassword");

  
  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }
  function hideError(el) {
    if (!el) return;
    el.style.display = "none";
  }

  async function doLogin() {
    const identifier = (emailInput?.value || "").trim();  
    const password   = (passwordInput?.value || "").trim();

    let valid = true;

    // check basic input
    if (!identifier) {
      showError(emailError, "נא להזין אימייל או שם משתמש");
      emailInput?.classList.add("input-error");
      valid = false;
    } else {
      hideError(emailError);
      emailInput?.classList.remove("input-error");
    }

    if (!password) {
      showError(passwordError, "נא להזין סיסמה");
      passwordInput?.classList.add("input-error");
      valid = false;
    } else {
      hideError(passwordError);
      passwordInput?.classList.remove("input-error");
    }

    if (!valid) return;

    
    const payload = { password };
    if (isValidEmail(identifier)) {
      payload.email = identifier;
    } else {
      payload.username = identifier;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "מתחבר/ת...";
    }

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }

      // save the token and the user
      localStorage.setItem("token", data.token);
      localStorage.setItem("jwt_token", data.token);
      if (data.user) {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
      }

      // go to the feed page
      window.location.href = "/feed"; 
    } catch (err) {
      console.error("Login error:", err);
      showError(passwordError, err.message || "שגיאה בהתחברות");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "התחבר/י";
      }
    }
  }

  
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      doLogin();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doLogin();
      }
    });
  }

  // show/hide password
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
      const type = passwordInput.getAttribute("type");
      if (type === "password") {
        passwordInput.setAttribute("type", "text");
        this.textContent = "הסתר";
      } else {
        passwordInput.setAttribute("type", "password");
        this.textContent = "הצג";
      }
    });
  }
});
