(function attachScenarioTrainerApp() {
    const root = typeof globalThis !== 'undefined' ? globalThis : window;
    const mount = document.getElementById('scenario-trainer-root');
    if (!mount) return;
    mount.innerHTML = '<div>stub</div>';
})();
