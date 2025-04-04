// script.js

// Load user data from localStorage
function getUserData() {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    return userData;
}

// Save user data to localStorage
function saveUserData(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
}
document.addEventListener("DOMContentLoaded", () => {
    const walletConnectBtn = document.querySelectorAll('.wallet-connect');
    const balanceDisplay = document.querySelectorAll('.balance p');
    const stakeBtn = document.querySelector("button[innerHTML='Stake']");
    const stakeInput = document.querySelector("input[placeholder='Enter xCIS Amount']");
    const stakeList = document.querySelector('.stake-list');
    const apiOptions = document.getElementsByName("duration");

    let walletAddress = null;
    let userBalance = { xCIS: 100, CIS: 0 }; // Default balance for testing.

    // Wallet connect function
    walletConnectBtn.forEach(btn => {
        btn.addEventListener("click", async () => {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            walletAddress = accounts[0];
            alert(`Wallet Connected: ${walletAddress}`);
            updateBalanceDisplay();
        });
    });

    // Update balance display
    function updateBalanceDisplay() {
        balanceDisplay[1].textContent = `xCIS: ${userBalance.xCIS}`;
        balanceDisplay[2].textContent = `CIS: ${userBalance.CIS}`;
    }

    // Stake button functionality
    stakeBtn.addEventListener("click", () => {
        const stakeAmount = parseInt(stakeInput.value);
        const selectedDuration = [...apiOptions].find(option => option.checked)?.value;

        if (!stakeAmount || stakeAmount <= 0) {
            alert("Please enter a valid xCIS amount.");
            return;
        }

        if (!selectedDuration) {
            alert("Please select a staking duration.");
            return;
        }

        if (stakeAmount > userBalance.xCIS) {
            alert("Insufficient xCIS balance.");
            return;
        }

        // Deduct staked amount and calculate rewards
        userBalance.xCIS -= stakeAmount;
        const rewardMultiplier = {
            "30": 1.3,
            "60": 1.6,
            "90": 1.9,
            "120": 2.2,
        };
        const reward = Math.round(stakeAmount * rewardMultiplier[selectedDuration]);

        // Add to stake list
        const stakeItem = document.createElement("div");
        stakeItem.classList.add("stake-item");
        stakeItem.innerHTML = `
            ${stakeAmount} xCIS - ${selectedDuration} Days (Reward: ${reward} xCIS)
            <button class="claim-btn">Claim</button>
        `;
        stakeList.appendChild(stakeItem);

        // Add claim functionality
        stakeItem.querySelector(".claim-btn").addEventListener("click", () => {
            userBalance.xCIS += reward;
            stakeList.removeChild(stakeItem);
            updateBalanceDisplay();
            alert(`Claimed ${reward} xCIS successfully.`);
        });

        updateBalanceDisplay();
        alert(`Staked ${stakeAmount} xCIS for ${selectedDuration} days. Potential reward: ${reward} xCIS.`);
    });
});

