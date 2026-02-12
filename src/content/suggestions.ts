// Real-time writing suggestions with LanguageTool API
let suggestionTimeout: number | null = null;
let currentTooltip: HTMLElement | null = null;

export function startSuggestionMonitoring(composeWindow: HTMLElement) {
    console.log('SmartMail AI Suggestions: 🚀 Starting monitoring...');

    const bodyContainer = composeWindow.querySelector('div[aria-label="Message Body"]') ||
        composeWindow.querySelector('div[role="textbox"][g_editable="true"]') ||
        composeWindow.querySelector('.Am.Al.editable');

    if (!bodyContainer) {
        console.error('SmartMail AI Suggestions: ❌ Could not find body container!');
        return;
    }

    console.log('SmartMail AI Suggestions: ✅ Found body container');

    // Use input events for better real-time detection
    const checkText = () => {
        console.log('SmartMail AI Suggestions: 🔔 Text changed!');
        if (suggestionTimeout) clearTimeout(suggestionTimeout);

        suggestionTimeout = window.setTimeout(() => {
            console.log('SmartMail AI Suggestions: ⏰ Running check now...');
            checkForSuggestions(bodyContainer as HTMLElement);
        }, 2000);
    };

    // Multiple event listeners for better detection
    bodyContainer.addEventListener('input', checkText);
    bodyContainer.addEventListener('keyup', checkText);
    bodyContainer.addEventListener('paste', checkText);

    // MutationObserver as backup
    const observer = new MutationObserver(checkText);
    observer.observe(bodyContainer, {
        characterData: true,
        subtree: true,
        childList: true
    });

    console.log('SmartMail AI Suggestions: ✅ Monitoring active! Type something to test...');
}

async function checkForSuggestions(bodyContainer: HTMLElement) {
    const text = bodyContainer.innerText.trim();

    console.log('SmartMail AI: 📝 Checking text:', text.substring(0, 100));
    console.log('SmartMail AI: Text length:', text.length);

    if (text.length < 10) {
        console.log('SmartMail AI: Text too short, skipping');
        removeAllUnderlines(bodyContainer);
        return;
    }

    // Try LanguageTool API (free, comprehensive grammar checking)
    try {
        console.log('SmartMail AI: 🌐 Calling LanguageTool API...');
        const apiIssues = await checkWithLanguageTool(text);
        if (apiIssues.length > 0) {
            console.log('SmartMail AI: ✅ Found', apiIssues.length, 'issues from API');
            highlightIssues(bodyContainer, apiIssues);
            return;
        } else {
            console.log('SmartMail AI: No issues found from API');
        }
    } catch (error) {
        console.warn('SmartMail AI: ⚠️ API failed, using local patterns:', error);
    }

    // Fallback to local patterns
    const issues = findBasicIssues(text);
    if (issues.length > 0) {
        console.log('SmartMail AI: Found', issues.length, 'local issues');
        highlightIssues(bodyContainer, issues);
    } else {
        console.log('SmartMail AI: No issues found');
        removeAllUnderlines(bodyContainer);
    }
}

// LanguageTool API - FREE grammar checking
async function checkWithLanguageTool(text: string): Promise<WritingIssue[]> {
    const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            text: text,
            language: 'en-US',
            enabledOnly: 'false'
        })
    });

    if (!response.ok) {
        throw new Error(`LanguageTool API error: ${response.status}`);
    }

    const data = await response.json();
    const issues: WritingIssue[] = [];

    console.log('SmartMail AI: API returned', data.matches.length, 'total matches');

    // Convert API matches to our format (limit to 5 to avoid clutter)
    for (const match of data.matches.slice(0, 5)) {
        const category = match.rule.category.id;
        let type: 'spelling' | 'grammar' | 'clarity' = 'grammar';

        if (category === 'TYPOS' || category === 'MISSPELLING') {
            type = 'spelling';
        } else if (category === 'STYLE' || category === 'REDUNDANCY') {
            type = 'clarity';
        }

        const wrongText = text.substring(match.offset, match.offset + match.length);
        const suggestion = match.replacements[0]?.value || wrongText;

        issues.push({
            type: type,
            text: wrongText,
            suggestion: suggestion,
            explanation: match.message
        });
    }

    return issues;
}

interface WritingIssue {
    type: 'spelling' | 'grammar' | 'clarity';
    text: string;
    suggestion: string;
    explanation: string;
}

// Local fallback patterns
function findBasicIssues(text: string): WritingIssue[] {
    const issues: WritingIssue[] = [];

    const spellingRules: { [key: string]: string } = {
        'wrot': 'wrote',
        'dindnt': "didn't",
        'didnt': "didn't",
        'dont': "don't",
        'cant': "can't",
        'thiis': 'this',
        'teh': 'the',
        'recieve': 'receive',
        'definately': 'definitely',
        'alot': 'a lot'
    };

    for (const [wrong, correct] of Object.entries(spellingRules)) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        if (regex.test(text)) {
            issues.push({
                type: 'spelling',
                text: wrong,
                suggestion: correct,
                explanation: `Did you mean "${correct}"?`
            });
        }
    }

    return issues;
}

function highlightIssues(bodyContainer: HTMLElement, issues: WritingIssue[]) {
    console.log('SmartMail AI: 🎨 Highlighting', issues.length, 'issues');

    removeAllUnderlines(bodyContainer);

    const html = bodyContainer.innerHTML;
    let newHtml = html;

    const typeColors = {
        spelling: '#EF4444',
        grammar: '#F59E0B',
        clarity: '#3B82F6'
    };

    issues.forEach((issue, index) => {
        const escapedText = issue.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedText})`, 'gi');
        const color = typeColors[issue.type];

        newHtml = newHtml.replace(regex, (match) => {
            return `<span class="smartmail-suggestion" data-issue-index="${index}" style="border-bottom: 2px solid ${color}; cursor: pointer;">${match}</span>`;
        });
    });

    if (newHtml !== html) {
        bodyContainer.innerHTML = newHtml;
        console.log('SmartMail AI: ✅ Underlines applied!');

        const suggestionSpans = bodyContainer.querySelectorAll('.smartmail-suggestion');
        suggestionSpans.forEach((span) => {
            const issueIndex = parseInt(span.getAttribute('data-issue-index') || '0');
            const issue = issues[issueIndex];

            span.addEventListener('mouseenter', (e) => {
                showTooltip(e.target as HTMLElement, issue, bodyContainer);
            });

            span.addEventListener('mouseleave', () => {
                removeTooltip();
            });
        });
    } else {
        console.warn('SmartMail AI: ⚠️ HTML unchanged, underlines not applied');
    }
}

function showTooltip(element: HTMLElement, issue: WritingIssue, bodyContainer: HTMLElement) {
    removeTooltip();

    const typeColors = {
        spelling: '#EF4444',
        grammar: '#F59E0B',
        clarity: '#3B82F6'
    };

    const tooltip = document.createElement('div');
    tooltip.className = 'smartmail-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: white;
        border: 2px solid ${typeColors[issue.type]};
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: 'Google Sans', Roboto, sans-serif;
        font-size: 13px;
        max-width: 250px;
        pointer-events: auto;
    `;

    tooltip.innerHTML = `
        <div style="color: ${typeColors[issue.type]}; font-weight: 600; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">
            ${issue.type}
        </div>
        <div style="color: #374151; margin-bottom: 8px;">
            ${issue.explanation}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 6px; background: #F3F4F6; border-radius: 4px;">
            <span style="text-decoration: line-through; color: #EF4444;">${issue.text}</span>
            <span style="color: #9CA3AF;">→</span>
            <span style="color: #10B981; font-weight: 600;">${issue.suggestion}</span>
        </div>
        <button class="apply-fix" style="
            width: 100%;
            background: ${typeColors[issue.type]};
            color: white;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        ">Apply Fix</button>
    `;

    const rect = element.getBoundingClientRect();
    const containerRect = bodyContainer.getBoundingClientRect();
    tooltip.style.left = `${rect.left - containerRect.left}px`;
    tooltip.style.top = `${rect.bottom - containerRect.top + 5}px`;

    const applyBtn = tooltip.querySelector('.apply-fix') as HTMLElement;
    applyBtn.onclick = () => {
        const currentText = bodyContainer.innerText;
        const escapedText = issue.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedText}\\b`, 'gi');
        const newText = currentText.replace(regex, issue.suggestion);
        bodyContainer.innerText = newText;
        removeTooltip();
    };

    bodyContainer.style.position = 'relative';
    bodyContainer.appendChild(tooltip);
    currentTooltip = tooltip;
}

function removeTooltip() {
    if (currentTooltip && currentTooltip.parentElement) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

function removeAllUnderlines(bodyContainer: HTMLElement) {
    const suggestions = bodyContainer.querySelectorAll('.smartmail-suggestion');
    suggestions.forEach(span => {
        const text = span.textContent;
        const textNode = document.createTextNode(text || '');
        span.parentNode?.replaceChild(textNode, span);
    });
    removeTooltip();
}
