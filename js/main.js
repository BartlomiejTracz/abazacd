import { getDatabase, saveNewSubject, markAsMastered, getMasteredIds, deleteSubject as deleteSubjectData } from './data.js';
import { QuizSession } from './quiz.js';
import { View } from './view.js';

const appContainer = document.getElementById('app');
let currentSession = null; 
let editingIndex = null;

let draftSubject = {
    name: "",
    questions: [],
    id: null
};

const Controller = {
    init: () => {
        Controller.loadTheme();
        Controller.goHome();
    },

    // --- MOTYWY ---
    toggleTheme: () => {
        const currentTheme = localStorage.getItem('app_theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        localStorage.setItem('app_theme', newTheme);
        const themeLink = document.getElementById('theme-style');
        themeLink.setAttribute('href', newTheme === 'dark' ? 'css/style_dark.css' : 'css/style.css');

        // Aktualizuj wszystkie slidery na ekranie
        document.querySelectorAll('.theme-switch input').forEach(input => {
            input.checked = (newTheme === 'dark');
        });
    },

    loadTheme: () => {
        let savedTheme = localStorage.getItem('app_theme');
        if (!savedTheme) {
            savedTheme = 'dark';
            localStorage.setItem('app_theme', 'dark');
        }
        const themeLink = document.getElementById('theme-style');
        themeLink.setAttribute('href', savedTheme === 'dark' ? 'css/style_dark.css' : 'css/style.css');
    },

    goHome: () => {
        const db = getDatabase();
        
        let html = `
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            ${View.themeToggle()}
            <h1 style="flex: 1; margin: 0; text-align: center; padding-right: 50px;">Moje Quizy</h1>
        </div>`;
        
        html += `<button class="btn" style="background:#6f42c1; margin-bottom:20px" onclick="window.app.openCreator()">+ DODAJ WŁASNĄ BAZĘ</button>`;
        html += `<div style="display:flex; gap:10px; margin-bottom:20px">
             <input type="file" id="import-file" accept=".json" style="display:none" onchange="window.app.handleFileImport(this)">
             <button class="btn" style="background:#20c997; flex:1" onclick="document.getElementById('import-file').click()">SZYBKI IMPORT</button>
        </div>`;
        html += db.map(s => View.homeCard(s)).join('');
        appContainer.innerHTML = html;
    },

    // --- KREATOR ---
    openCreator: () => {
        draftSubject = { name: "", questions: [], id: null };
        editingIndex = null;
        appContainer.innerHTML = View.creator();
        Controller.initCreator();
    },

    editSubject: (id) => {
        const db = getDatabase();
        const subject = db.find(s => s.id === id);
        if (!subject) return;
        draftSubject = JSON.parse(JSON.stringify(subject));
        editingIndex = null;
        appContainer.innerHTML = View.creator();
        document.getElementById('new-subject-name').value = draftSubject.name;
        Controller.updateDraftList();
        Controller.initCreator();
    },

    initCreator: () => {
        const answersWrap = document.getElementById('answers-wrap');
        answersWrap.innerHTML = ''; 
        for(let i = 0; i < 4; i++) answersWrap.innerHTML += View.answerInput(i);
    },

    addAnswerField: (value = "", isChecked = false) => {
        const answersWrap = document.getElementById('answers-wrap');
        const count = answersWrap.children.length;
        answersWrap.innerHTML += View.answerInput(count, value, isChecked);
    },

    removeAnswerField: (index) => {
        const rows = Array.from(document.querySelectorAll('.answer-row'));
        const newData = rows.map(row => ({
            text: row.querySelector('.answer-text').value,
            checked: row.querySelector('input[type="checkbox"]').checked
        }));
        newData.splice(index, 1);
        const answersWrap = document.getElementById('answers-wrap');
        answersWrap.innerHTML = '';
        newData.forEach((data, i) => Controller.addAnswerField(data.text, data.checked));
    },

    saveQuestionToDraft: () => {
        const qText = document.getElementById('q-text').value.trim();
        const rows = Array.from(document.querySelectorAll('.answer-row'));
        const answers = rows.map(r => r.querySelector('.answer-text').value.trim()).filter(v => v !== '');
        const correct = rows.map((r, i) => r.querySelector('input[type="checkbox"]').checked ? i : null).filter(v => v !== null);

        if(!qText || answers.length < 2 || correct.length === 0){
            alert("Wpisz pytanie, min. 2 odpowiedzi i zaznacz przynajmniej jedną poprawną!");
            return;
        }

        const qId = (editingIndex !== null && draftSubject.questions[editingIndex]?.id) ? draftSubject.questions[editingIndex].id : Date.now() + Math.random();

        const questionObj = { id: qId, text: qText, answers, correct };

        if (editingIndex !== null) {
            draftSubject.questions[editingIndex] = questionObj;
            editingIndex = null;
        } else {
            draftSubject.questions.push(questionObj);
        }

        document.getElementById('q-text').value = '';
        Controller.initCreator();
        Controller.updateDraftList();
    },

    updateDraftList: () => {
        document.getElementById('q-count').textContent = draftSubject.questions.length;
        document.getElementById('draft-list').innerHTML = draftSubject.questions.length ? 
            draftSubject.questions.map((q, idx) => View.draftItem(q, idx)).join('') : 
            '<p style="padding:10px; opacity:0.7">Brak pytań.</p>';
        Controller.renderMath();
    },

    editDraftQuestion: (index) => {
        const q = draftSubject.questions[index];
        editingIndex = index;
        
        document.getElementById('q-text').value = q.text;
        const answersWrap = document.getElementById('answers-wrap');
        answersWrap.innerHTML = '';
        q.answers.forEach((ans, i) => Controller.addAnswerField(ans, q.correct.includes(i)));
        
        document.querySelector('.card').scrollIntoView({behavior: 'smooth'});
    },

    deleteDraftQuestion: (index) => {
        if (editingIndex === index) {
            editingIndex = null;
            document.getElementById('q-text').value = '';
            Controller.initCreator();
        } else if (editingIndex !== null && index < editingIndex) {
            editingIndex--;
        }

        draftSubject.questions.splice(index, 1);
        Controller.updateDraftList();
    },

    saveDatabase: () => {
        const qText = document.getElementById('q-text')?.value.trim();
        if (qText) {
            const rows = Array.from(document.querySelectorAll('.answer-row'));
            const answers = rows.map(r => r.querySelector('.answer-text').value.trim()).filter(v => v !== '');
            const correct = rows.map((r, i) => r.querySelector('input[type="checkbox"]').checked ? i : null).filter(v => v !== null);
            if (answers.length >= 2 && correct.length > 0) {
                Controller.saveQuestionToDraft();
            }
        }

        const name = document.getElementById('new-subject-name').value;
        if(!name || draftSubject.questions.length === 0) return alert("Podaj nazwę i dodaj pytania!");
        draftSubject.name = name;
        if (!draftSubject.id) draftSubject.id = "custom_" + Date.now();
        saveNewSubject(draftSubject);
        alert("Zapisano!");
        Controller.goHome();
    },

    downloadJSON: () => {
        const name = document.getElementById('new-subject-name').value || "BezNazwy";
        if(draftSubject.questions.length === 0) return alert("Brak pytań!");
        draftSubject.name = name;
        const blob = new Blob([JSON.stringify(draftSubject)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${name}.json`; a.click();
    },

    loadDraftFromFile: (input) => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (json.questions) {
                    json.questions.forEach(q => {
                        if (typeof q.correct === 'number') q.correct = [q.correct];
                        if (!q.correct) q.correct = [];
                    });
                }
                draftSubject = { name: json.name, questions: json.questions, id: null };
                document.getElementById('new-subject-name').value = json.name;
                editingIndex = null;
                Controller.updateDraftList();
                input.value = ''; 
                alert(`Wczytano bazę: ${json.name}`);
            } catch (err) { 
                console.error(err); 
                alert("Błąd pliku! (Sprawdź konsolę F12 po szczegóły)"); 
            }
        };
        reader.readAsText(file);
    },

    handleFileImport: (input) => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                json.id = "import_" + Date.now();
                saveNewSubject(json);
                Controller.goHome();
            } catch (err) { alert("Błąd formatu!"); }
        };
        reader.readAsText(file);
    },

    // --- PODGLĄD / START ---

    openSubject: (id) => {
        const subject = getDatabase().find(s => s.id === id);
        if(subject) appContainer.innerHTML = View.subjectDetails(subject);
    },

    openStudyReview: (id) => {
        const subject = getDatabase().find(s => s.id === id);
        if (!subject) return;
        appContainer.innerHTML = View.studyList(subject);
        window.scrollTo(0, 0);
        Controller.renderMath();
    },

    deleteSubject: (id) => {
        if(confirm("Usunąć bazę?")) { deleteSubjectData(id); Controller.goHome(); }
    },

    startCustomExam: (subjectId) => {
        const input = document.getElementById('exam-count-input');
        if (!input) return;
        
        const count = parseInt(input.value);
        const subject = getDatabase().find(s => s.id === subjectId);
        if (!subject) return;

        if (isNaN(count) || count < 1) return alert("Podaj poprawną liczbę!");
        const finalCount = Math.min(count, subject.questions.length);
        window.app.startQuiz(subjectId, finalCount);
    },

    // --- QUIZ ---

    startQuiz: (subjectId, mode) => {
        const subject = getDatabase().find(s => s.id === subjectId);
        if (!subject) return;

        const mastered = getMasteredIds(subjectId); 
        currentSession = new QuizSession(subjectId, subject.questions, mode, mastered);
        Controller.renderCurrentQuestion();
    },

    // NOWA METODA: uruchom quiz z własną listą pytań (np. tylko błędne)
    startQuizWithQuestions: (subjectId, questions, mode) => {
        const subject = getDatabase().find(s => s.id === subjectId);
        if (!subject) return;
        currentSession = new QuizSession(subjectId, subject.questions, mode, [], questions);
        Controller.renderCurrentQuestion();
    },

    renderCurrentQuestion: () => {
        appContainer.innerHTML = View.question(currentSession);
        Controller.renderMath();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    restartQuiz: () => {
        if (!currentSession) return;
        currentSession.score = 0;
        currentSession.currentIndex = 0;
        currentSession.history = [];
        Controller.renderCurrentQuestion();
    },

    // NOWA METODA: powtórka tylko błędnych odpowiedzi
    repeatWrong: () => {
        if (!currentSession || !currentSession.history.length) {
            alert("Brak sesji do powtórzenia.");
            return;
        }
        const wrongEntries = currentSession.history.filter(entry => !entry.isCorrect);
        if (wrongEntries.length === 0) {
            alert("Wszystkie odpowiedzi były poprawne! Brak błędnych pytań do powtórki.");
            return;
        }
        const wrongQuestions = wrongEntries.map(entry => entry.question);
        // Uruchom nowy quiz w trybie interaktywnym (nauka) z tymi pytaniami
        Controller.startQuizWithQuestions(currentSession.subjectId, wrongQuestions, 'all');
    },

    toggleSelection: (index) => {
        const checkbox = document.getElementById(`ans-${index}`);
        if (!checkbox) return;

        checkbox.checked = !checkbox.checked;
        checkbox.parentElement.classList.toggle('selected', checkbox.checked);

        const anySelected = document.querySelectorAll('.quiz-check:checked').length > 0;
        const submitBtn = document.getElementById('submit-answer-btn');
        if (submitBtn) {
            submitBtn.disabled = !anySelected;
        }
    },

    toggleResultsView: () => {
        const list = document.getElementById('results-list');
        const btn = document.getElementById('toggle-results-btn');
        
        if (list.classList.contains('hide-correct')) {
            list.classList.remove('hide-correct');
            btn.textContent = "Ukryj poprawne odpowiedzi";
            btn.style.background = "#f1c40f";
            btn.style.color = "#333";
        } else {
            list.classList.add('hide-correct');
            btn.textContent = "Pokaż wszystkie odpowiedzi";
            btn.style.background = "#3498db";
            btn.style.color = "white";
        }
    },

    renderMath: () => {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(appContainer, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        }
    },

    toggleGuessedOnlyView: () => {
        const list = document.getElementById('results-list');
        const btn = document.getElementById('toggle-guessed-btn');
        
        if (list.classList.contains('show-only-guessed')) {
            list.classList.remove('show-only-guessed');
            btn.textContent = "Pokaż tylko strzały";
            btn.style.background = "#e67e22";
        } else {
            list.classList.add('show-only-guessed');
            btn.textContent = "Pokaż wszystkie pytania";
            btn.style.background = "#3498db";
        }
    },

    handleAnswer: () => {
        const submitBtn = document.getElementById('submit-answer-btn');
        if (!submitBtn || submitBtn.disabled) return;

        const selected = Array.from(document.querySelectorAll('.quiz-check'))
            .map((ch, i) => ch.checked ? i : null)
            .filter(v => v !== null);

        if (selected.length === 0) return;

        submitBtn.disabled = true;

        const guessedCheck = document.getElementById('guessed-check');
        const isGuessed = guessedCheck ? guessedCheck.checked : false;

        const isCorrect = currentSession.submitAnswer(selected, isGuessed);
        const q = currentSession.getCurrentQuestion();

        if (isCorrect && !isGuessed) markAsMastered(currentSession.subjectId, q.id);

        const isExamMode = typeof currentSession.mode === 'number';

        if (isExamMode) {
            if (currentSession.next()) {
                Controller.renderCurrentQuestion();
            } else {
                appContainer.innerHTML = View.results(currentSession);
                Controller.renderMath();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            submitBtn.style.opacity = "0.6";
            submitBtn.textContent = "Czekaj..."; 

            const rows = document.querySelectorAll('.answer-option');
            rows.forEach((row, i) => {
                const isRowCorrect = q.correct.includes(i);
                const isRowSelected = selected.includes(i);
                
                if (isRowCorrect) row.classList.add('btn-correct');
                else if (isRowSelected) row.classList.add('btn-wrong');
                
                row.style.pointerEvents = 'none';
            });

            setTimeout(() => {
                if (currentSession.next()) {
                    Controller.renderCurrentQuestion();
                } else {
                    appContainer.innerHTML = View.results(currentSession);
                    Controller.renderMath();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 2000);
        }
    },
};

window.app = Controller;
Controller.init();