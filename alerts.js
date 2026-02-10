document.querySelectorAll(".taken").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.parentElement.parentElement.innerHTML = "✔ Medicine Taken";
  });
});

document.querySelectorAll(".skip").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.parentElement.parentElement.innerHTML = "⚠ Medicine Skipped";
  });
});
