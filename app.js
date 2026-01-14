
const app = document.getElementById('app');

app.innerHTML = `
  <section class="card">
    <h2>Dashboard</h2>
    <div class="ring">$0 / $0</div>
  </section>

  <nav class="bottom">
    <button onclick="openPage('home')">Home</button>
    <button onclick="openPage('finances')">Finances</button>
    <button onclick="openPage('nutrition')">Nutrition</button>
    <button onclick="openPage('workouts')">Workouts</button>
    <button onclick="openPage('settings')">Settings</button>
  </nav>
`;

function openPage(page){
  alert('Open ' + page);
}
