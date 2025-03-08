function calculate() {
    // fetching values from 3 input fields
    const principle = parseFloat(document.getElementById('principle').value) || 0;
    const interest = parseFloat(document.getElementById('int').value) || 0;
    const tenure = parseFloat(document.getElementById('tenure').value) || 0;

    // validation check--> value must be greater than 0
    if (principle <= 0 || interest <= 0 || tenure <= 0) {
        document.getElementById('result').innerText = "Invalid Input!";
        return;
    }

    // calculating total amount
    const total = principle + (principle * interest * tenure) / 100;

    // total amount is displayed inside id "result"
    document.getElementById('result').innerText = `Total: ${total.toFixed(2)}$`;
}

document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById('calculateBtn');
    if (btn) {
        btn.addEventListener('click', calculate);
    } else {
        console.error("Button with ID 'calculateBtn' not found.");
    }

    // Add event listener for Enter key on all input fields
    const inputs = document.querySelectorAll("input");
    inputs.forEach(input => {
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                calculate();
            }
        });
    });
});

