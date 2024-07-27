const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
	container.classList.add("right-panel-active");
});

// signInButton.addEventListener('click', () => {
// 	container.classList.remove("right-panel-active");
//     // window.location.href = 'index.html'; // Redirect to index.html
// 	window.location.href = '../index.html';

// });
signInButton.addEventListener('click', () => {
    console.log("Sign In button clicked");
    container.classList.remove("right-panel-active");
    window.location.href = 'index.html'; // Redirect to index.html
});



