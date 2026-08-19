const $ = (selector) => document.querySelector(selector);

const pinScreen = $("#pin-screen");
const voteScreen = $("#vote-screen");
const pinInput = $("#pin");
const pinMessage = $("#pin-message");
const voterInfo = $("#voter-info");
const candidateSelect = $("#candidate");
const voteMessage = $("#vote-message");

let voter = null;

$("#verify").addEventListener("click", async () => {
  pinMessage.textContent = "";
  const pin = pinInput.value.trim();

  try {
    const response = await fetch("/api/verify-pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin })
    });

    const data = await response.json();

    if (!response.ok || !data.allowed) {
      pinMessage.textContent = data.error || "Access denied.";
      return;
    }

    voter = data.voter;

    voterInfo.textContent =
      `${voter.name} — ${voter.team}`;

    candidateSelect.innerHTML = "";

    for (const player of data.candidates) {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = player.name;
      candidateSelect.appendChild(option);
    }

    pinScreen.hidden = true;
    voteScreen.hidden = false;
  } catch {
    pinMessage.textContent = "Unable to contact the voting server.";
  }
});

$("#submit-vote").addEventListener("click", async () => {
  voteMessage.textContent = "";

  if (!voter || !candidateSelect.value) {
    voteMessage.textContent = "Please select a player.";
    return;
  }

  try {
    const response = await fetch("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        voterId: voter.id,
        candidateId: candidateSelect.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      voteMessage.textContent = data.error || "Vote was not accepted.";
      return;
    }

    voteMessage.textContent = "Vote submitted successfully.";
    $("#submit-vote").disabled = true;
    candidateSelect.disabled = true;
  } catch {
    voteMessage.textContent = "Unable to contact the voting server.";
  }
});
