import { getMasteredIds } from './data.js';

function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export const View = {
    homeCard(subject) {
        const totalQ = subject.questions.length;
        const masteredCount = getMasteredIds(subject.id).length;
        const percent = totalQ > 0 ? Math.floor((masteredCount / totalQ) * 100) : 0;

        const isCustom = subject.id.toString().startsWith('custom_') || subject.id.toString().startsWith('import_');
        const safeName = escapeHTML(subject.name);

        let buttonsHtml = '';
        if (isCustom) {
            buttonsHtml = `
            <div class="subject-actions">
                <button class="btn-icon btn-edit-home" aria-label="Edytuj bazę" title="Edytuj bazę" onclick="event.stopPropagation(); window.app.editSubject('${subject.id}')">Edytuj</button>
                <button class="btn-icon btn-delete-home" aria-label="Usuń bazę" title="Usuń bazę" onclick="event.stopPropagation(); window.app.deleteSubject('${subject.id}')">Usuń</button>
            </div>`;
        }

        return `
        <div class="card card-home" onclick="window.app.openSubject('${subject.id}')">
            <div class="subject-heading">
                <h3>${safeName}</h3>
                ${buttonsHtml}
            </div>
            <p class="subject-meta">Baza: ${totalQ} pytań <span aria-hidden="true">·</span> Opanowano: ${percent}%</p>
            <div class="stats-bar"><div class="stats-fill" style="width: ${percent}%"></div></div>
        </div>`;
    },

   subjectDetails(subject) {
        const total = subject.questions.length;
        const defaultCount = Math.min(40, total);
        const safeName = escapeHTML(subject.name);

        return `
        <button class="btn btn-back" onclick="window.app.goHome()">← Wróć</button>
        <h1>${safeName}</h1>

        <div class="card mode-section mode-review">
            <h3>Przegląd Bazy</h3>
            <p>Zobacz wszystkie pytania wraz z poprawnymi odpowiedziami bez rozwiązywania testu.</p>
            <button class="btn btn-warning" onclick="window.app.openStudyReview('${subject.id}')">Pokaż listę pytań</button>
        </div>

        <div class="card mode-section mode-exam">
            <h3>Tryb Egzaminu</h3>
            <p>Losowe pytania z puli (Dostępnych: ${total})</p>

            <label class="field-label" for="exam-count-input">Ile pytań wylosować?</label>
            <div class="exam-count">
                <input type="number" id="exam-count-input" class="input-field"
                       value="${defaultCount}" min="1" max="${total}"
                       style="margin:0">
            </div>

            <button class="btn" onclick="window.app.startCustomExam('${subject.id}')">Start Egzaminu</button>
        </div>

        <div class="card mode-section mode-learn">
            <h3>Tryb Nauki (Interaktywny)</h3>
            <p>Przejdź przez całą bazę (${total} pytań) rozwiązując je po kolei.</p>
            <button class="btn btn-success" onclick="window.app.startQuiz('${subject.id}', 'all')">Ucz się wszystkiego</button>
        </div>`;
    },

    question(quizSession) {
        const q = quizSession.getCurrentQuestion();
        const current = quizSession.currentIndex + 1;
        const total = quizSession.questions.length;
        const isExam = typeof quizSession.mode === 'number';
        const scoreHtml = isExam ? '' : `<span>Punkty: ${quizSession.score}</span>`;

        let answersHtml = q.answers.map((ans, idx) => `
            <div class="answer-option" onclick="window.app.toggleSelection(${idx})">
                <input type="checkbox" id="ans-${idx}" class="quiz-check" aria-label="${escapeHTML(ans)}">
                <span class="answer-label">${escapeHTML(ans)}</span>
            </div>
        `).join('');

        return `
        <div class="quiz-header">
            <button class="theme-toggle-btn" aria-label="Zmień motyw" title="Zmień motyw" onclick="window.app.toggleTheme()">${window.app.getThemeIcon()}</button>
            <span>Pytanie ${current}/${total}</span>
            <button class="btn btn-back quiz-exit" onclick="window.app.goHome()">Wyjdź</button>
        </div>
        <div class="quiz-score">
            ${scoreHtml}
        </div>
       <div class="stats-bar quiz-progress" role="progressbar" aria-label="Postęp quizu" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${current}"><div class="stats-fill" style="width:${current / total * 100}%; --progress-from:${(current - 1) / total * 100}%"></div></div>
        <div class="question-stage">
        <div class="question-heading"><h3>${escapeHTML(q.text)}</h3></div>
        <div id="answers-container">${answersHtml}</div>

        <div class="guess-option">
            <input type="checkbox" id="guessed-check" >
            <label for="guessed-check">Nie byłem pewny</label>
        </div>

        <button id="submit-answer-btn" class="btn btn-success submit-answer" onclick="window.app.handleAnswer()" disabled>Zatwierdź odpowiedź</button>
        </div>
        `;
    },

results(quizSession) {
        const total = quizSession.questions.length;
        const percent = Math.round((quizSession.score / total) * 100);

        let resultsHtml = '';

        quizSession.history.forEach(({ isCorrect, userSelected, question, isGuessed }, index) => {

            const borderColor = isCorrect ? '#2ecc71' : '#dc3545';
            const resultClass = isCorrect ? 'result-correct-card' : 'result-wrong-card';
            const icon = isCorrect ? '✓' : '×';

            // Zmienna generująca plakietkę
            const guessedBadge = isGuessed
                ? `<span class="guessed-note">Strzał</span>`
                : '';

            // NOWE: Klasa pomocnicza do ukrywania/pokazywania tylko strzałów
            const guessedClass = isGuessed ? 'result-guessed-card' : 'result-not-guessed-card';

            const userAnsList = userSelected
                .map(i => `<li>${escapeHTML(question.answers[i])}</li>`)
                .join('');

            const correctAnsList = question.correct
                .map(i => `<li>${escapeHTML(question.answers[i])}</li>`)
                .join('');

            const userAnsDisplay = userSelected.length > 0
                ? `<ul class="result-answers" style="--answer-color: ${isCorrect ? 'var(--success-text)' : 'var(--danger-text)'};">${userAnsList}</ul>`
                : '<span class="incorrect-answer">Brak odpowiedzi</span>';

            const correctAnsDisplay = `<ul class="result-answers correct-answer">${correctAnsList}</ul>`;

            resultsHtml += `
            <div class="card ${resultClass} ${guessedClass}" style="--result-accent:${borderColor}">
                <div class="result-icon" aria-hidden="true">${icon}</div>
                <p class="result-question"><strong>${index + 1}. ${escapeHTML(question.text)}</strong> ${guessedBadge}</p>

                <div class="result-answer-group">
                    <p class="result-label">Twoje odpowiedzi:</p>
                    ${userAnsDisplay}
                </div>
                ${isCorrect ? '' : `
                <div class="result-correction">
                    <p class="result-label">Poprawne odpowiedzi:</p>
                    ${correctAnsDisplay}
                </div>`}
            </div>`;
        });

        // AKTUALIZACJA: Reguły CSS dla obu filtrów
        const styleBlock = `
        <style>
            .hide-correct .result-correct-card { display: none; }
            .show-only-guessed .card:not(.result-guessed-card) { display: none; }
        </style>`;

        return `
        ${styleBlock}
        <h1 class="results-title">Wynik: ${percent}%</h1>
        <div class="results-summary">
            Poprawne: ${quizSession.score} / ${total}
        </div>

        <div class="result-filters">
            <button id="toggle-results-btn" class="btn btn-warning" onclick="window.app.toggleResultsView()">
                Ukryj poprawne odpowiedzi
            </button>
            <button id="toggle-guessed-btn" class="btn btn-orange" onclick="window.app.toggleGuessedOnlyView()">
                Pokaż tylko strzały
            </button>
        </div>

        <div id="results-list">
            ${resultsHtml}
        </div>

        <div class="action-row results-actions">
            <button class="btn btn-teal" onclick="window.app.restartQuiz()">Powtórz (Restart)</button>
            <button class="btn" onclick="window.app.goHome()">Menu Główne</button>
        </div>
        `;
    },

    creator() {
        return `
        <button class="btn btn-back" onclick="window.app.goHome()">← Anuluj</button>
        <h1>Kreator Bazy</h1>
        <div class="card">
            <label class="field-label" for="new-subject-name">Nazwa Przedmiotu:</label>
            <input type="text" id="new-subject-name" class="input-field" placeholder="np. Farmakologia">
        </div>
        <div class="card mode-section mode-exam">
            <h3>Edytor Pytania</h3>
            <label class="field-label" for="q-text">Treść pytania:</label>
            <input type="text" id="q-text" class="input-field" placeholder="Wpisz treść...">
            <label class="field-label">Odpowiedzi (zaznacz wszystkie poprawne):</label>
            <div id="answers-wrap"></div>
            <button class="btn btn-teal" onclick="window.app.addAnswerField()">+ Dodaj kolejną odpowiedź</button>
            <hr>
            <button class="btn btn-success" onclick="window.app.saveQuestionToDraft()">Zatwierdź Pytanie</button>
        </div>
        <div class="card">
            <h3>Lista pytań (<span id="q-count">0</span>)</h3>
            <div id="draft-list"></div>
        </div>
        <div class="action-row creator-actions">
            <button class="btn" onclick="window.app.saveDatabase()">Zapisz</button>
            <button class="btn btn-warning" onclick="window.app.downloadJSON()">Pobierz</button>
            <input type="file" id="draft-file-input" accept=".json" style="display:none" onchange="window.app.loadDraftFromFile(this)">
            <button class="btn btn-teal" onclick="document.getElementById('draft-file-input').click()">Wczytaj</button>
        </div>`;
    },

    answerInput(index, value = "", isChecked = false) {
        return `
        <div class="answer-row" id="ans-row-${index}">
            <input type="checkbox" name="correct-ans" value="${index}" ${isChecked ? 'checked' : ''}>
            <input type="text" class="input-field answer-text" data-idx="${index}" value="${escapeHTML(value)}" placeholder="Odp ${index + 1}" style="margin:0">
            <button onclick="window.app.removeAnswerField(${index})" class="remove-answer" aria-label="Usuń odpowiedź">×</button>
        </div>`;
    },

    draftItem(question, index) {
        const safeText = escapeHTML(question.text);
        const correctAnswers = question.correct.map(i => escapeHTML(question.answers[i])).join(', ');

        return `
        <div class="card draft-item">
            <div class="draft-question">${index + 1}. ${safeText}</div>
            <div class="draft-meta">
                Poprawne: <strong class="correct-answer">${correctAnswers}</strong>
            </div>
            <div class="draft-actions">
                <button class="btn-edit" onclick="window.app.editDraftQuestion(${index})">Edytuj</button>
                <button class="btn-delete" onclick="window.app.deleteDraftQuestion(${index})">Usuń</button>
            </div>
        </div>`;
    },

    studyList(subject) {
        const listHtml = subject.questions.map((q, index) => {
            const safeText = escapeHTML(q.text);
            const answersHtml = q.answers.map((ans, aIdx) => {
                const isCorrect = q.correct.includes(aIdx);
                const style = isCorrect
                    ? 'border-color:var(--success-border); color:var(--success-text); background:var(--success-soft); font-weight:600;'
                    : 'border-color:transparent; color:var(--muted);';
                return `<div class="study-answer" style="${style}"><span class="study-mark" aria-hidden="true">${isCorrect ? '✓' : '·'}</span> ${escapeHTML(ans)}</div>`;
            }).join('');

            return `
            <div class="card study-question">
                <h3 class="study-number">Pytanie ${index + 1}</h3>
                <p class="study-text">${safeText}</p>
                <div class="study-answers">${answersHtml}</div>
            </div>`;
        }).join('');

        return `
        <div class="sticky-header">
            <button class="btn back-btn-top" onclick="window.app.openSubject('${subject.id}')">
                ← Wróć
            </button>
            <button class="theme-toggle-btn sticky-theme" aria-label="Zmień motyw" title="Zmień motyw" onclick="window.app.toggleTheme()">
                ${window.app.getThemeIcon()}
            </button>
        </div>

        <div class="study-intro">
            <h2>Przegląd Bazy</h2>
            <p>${escapeHTML(subject.name)}</p>
        </div>

        <div class="study-list">
            ${listHtml}
        </div>
        `;
    }
};
