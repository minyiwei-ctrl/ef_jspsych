// experiment.js
// ⭐ 终极绕过：使用一个原始 HTML 插件并在 setTimeout 中强制执行数据保存，以绕过所有 jsPsych 回调限制。 ⭐

// Initialization: jsPsych is the instance object
const jsPsych = initJsPsych({}); 

// =================================================================
// 1. CONFIGURATION AND GLOBAL VARIABLES
// =================================================================

// ❗❗❗ IMPORTANT: This is your PythonAnywhere data receiving route ❗❗❗
const SERVER_URL = 'https://yiwei26.pythonanywhere.com/submit_data'; 

let participantId = 'NO_PID_SET'; 
let timeline = [];

// =================================================================
// 2. PID EXTRACTION AND DATA PROPERTIES (Same as before)
// =================================================================

const urlParams = new URLSearchParams(window.location.search);
participantId = urlParams.get('pid') || 'NO_PID_FOUND';

jsPsych.data.addProperties({
    pid: participantId, 
    date_time: new Date().toLocaleString()
});

if (participantId === 'NO_PID_FOUND') {
    document.body.innerHTML = `
        <div style="text-align: center; margin-top: 50px; color: red;">
            <h1>Error: Missing Participant ID (PID)</h1>
            <p>Please manually append <code>?pid=TESTER_ID</code> to the URL.</p>
        </div>
    `;
    throw new Error("Missing participant ID in URL.");
}

console.log('Participant PID set to:', participantId);

// =================================================================
// 3. INITIAL FLOW & STROOP TASK DEFINITION (Content Remains Unchanged)
// =================================================================

// [Welcome, Fullscreen, Instructions remain here as timeline.push() calls]
const welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Welcome to the Executive Function Study</h2>
        <p>This experiment tests cognitive inhibition (Stroop Task).</p>
        <p>Press the <strong>SPACEBAR</strong> to enter full screen and continue.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'welcome_screen' }
};
timeline.push(welcome);

const fullscreen = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: `<p>The experiment will run in full-screen mode. Please press <strong>Continue</strong> to proceed.</p>`,
    button_label: 'Continue',
    data: { data_type: 'exclude_data', task: 'fullscreen' }
};
timeline.push(fullscreen);

const stroop_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Task Instructions: Stroop Task</h2>
        <p>Please judge the **COLOR** of the word, ignoring the word's meaning.</p>
        <p>Respond **as quickly and accurately as possible** using these keys:</p>
        <ul>
            <li>Press <strong>R</strong> key if the color is <span style="color:red; font-weight:bold;">RED</span></li>
            <li>Press <strong>B</strong> key if the color is <span style="color:blue; font-weight:bold;">BLUE</span></li>
        </ul>
        <p>Press the <strong>SPACEBAR</strong> to start the task.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'instructions' }
};
timeline.push(stroop_instructions);

// --- Stroop Task Logic (Simplified, remaining the same) ---
const inkColors = ['red', 'blue'];
const wordMeanings = ['RED', 'BLUE']; 
const responseKeys = ['r', 'b']; 

function create_stroop_trial(word, color, correct_key) {
    const condition = (word === (color === 'red' ? 'RED' : 'BLUE')) ? 'congruent' : 'incongruent';
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="font-size: 100px; font-weight: bold; padding: 50px; color:${color};">${word}</div>`, 
        choices: responseKeys,
        trial_duration: 2000, 
        post_trial_gap: 0, 
        data: {
            data_type: 'trial_data', 
            task: 'stroop',
            word_meaning: word,
            ink_color: color,
            condition: condition,
            correct_response: correct_key
        },
        on_finish: function(data) {
            data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
            data.response_label = data.response === 'r' ? 'red' : (data.response === 'b' ? 'blue' : 'miss');
        }
    };
}

let base_trials = [];
inkColors.forEach((color, index) => {
    base_trials.push(create_stroop_trial(wordMeanings[index], inkColors[index], responseKeys[index])); 
    const wrong_index = (index + 1) % 2; 
    base_trials.push(create_stroop_trial(wordMeanings[wrong_index], inkColors[index], responseKeys[index])); 
});

let stroop_trials_full = [];
const repetition_factor = 10; 
for (let i = 0; i < repetition_factor; i++) {
    stroop_trials_full = stroop_trials_full.concat(base_trials); 
}

const shuffled_stroop_trials = stroop_trials_full.sort(() => Math.random() - 0.5);

const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 500,
    data: { data_type: 'exclude_data', task: 'fixation' }
};

let stroop_procedure = [];
shuffled_stroop_trials.forEach(trial => {
    stroop_procedure.push(fixation);
    stroop_procedure.push(trial);
});

timeline.push({
    timeline: stroop_procedure,
    label: 'stroop_block'
});

// =================================================================
// 4. DATA SAVING AND FINAL SCREEN FUNCTION
// =================================================================

function renderFinalScreen(message, color, currentPid) {
    // This is now outside of jsPsych's control entirely
    const displayElement = document.body;
    
    // Completely clear the body to guarantee no jsPsych artifacts remain
    displayElement.innerHTML = '';
    
    const finalContent = document.createElement('div');
    finalContent.style.textAlign = 'center';
    finalContent.style.marginTop = '100px';
    finalContent.innerHTML = `
        <h2>Experiment Complete!</h2>
        <p style="color:${color}; font-size: 1.2em;"><strong>${message}</strong></p>
        <p>Your PID is: ${currentPid}</p>
        <p>You may now safely close this window.</p>
    `;
    
    displayElement.appendChild(finalContent);
    
    // Attempt to exit fullscreen regardless (using global API if available)
    try {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { 
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    } catch (e) {
        // Do nothing
    }
}


/**
 * Sends data and calls renderFinalScreen on success/failure.
 */
function save_and_display_data(currentPid) {
    if (!currentPid || currentPid === 'NO_PID_SET' || currentPid === 'NO_PID_FOUND') {
        renderFinalScreen(
            'Experiment Complete, but Data NOT Saved! PID was not recognized.', 
            'red', 
            currentPid
        );
        return; 
    }

    console.log("STEP 1: Data Saving Initiated via Primitive Hook for PID:", currentPid); 

    const data_to_send = jsPsych.data.get().json(); 
    
    // STEP 2: Initiate fetch request
    fetch(SERVER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data_to_send,
    })
    .then(response => {
        console.log("STEP 3: Fetch Response Received. Status:", response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json(); 
    })
    .then(data => {
        console.log("STEP 4: JSON Data Parsed. Server Status:", data.status);
        let message = data.status === 'success' ? 
                      `Data submission successful! Thank you for your participation.` : 
                      `Data upload failed. Server error: ${data.message}.`;
        let color = data.status === 'success' ? 'green' : 'red'; 
        renderFinalScreen(message, color, currentPid);
    })
    .catch(error => {
        console.error('STEP FAILED: Network connection, HTTP, or JSON parsing error.', error);
        
        const message = `Data Upload Error! Automatic data upload failed. Error Message: ${error.message}. Please contact the experimenter.`;
        renderFinalScreen(message, 'red', currentPid);
    });
}

// =================================================================
// 5. PRIMITIVE FINAL PLUGIN (CRITICAL BYPASS)
// =================================================================

// 创建一个极简的插件来执行数据保存
const primitive_final_plugin = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h2>Experiment complete. Please wait, data is being saved...</h2><p>Do not close this window.</p>',
    choices: 'NO_KEYS',
    trial_duration: 1000, // Very short duration, as we will handle screen display ourselves
    on_load: function(element) {
        // ⭐⭐ CRITICAL FIX: Use a small delay to escape jsPsych's trial cleanup phase
        setTimeout(() => {
             // Force exit fullscreen BEFORE data save, to ensure execution in a normal window state
             try {
                jsPsych.pluginAPI.exitFullscreen();
             } catch (e) {
                 // Ignore
             }
            save_and_display_data(participantId);
            // After calling data save, end the jsPsych trial immediately
            jsPsych.finishTrial();
        }, 100); 
    }
};

timeline.push(primitive_final_plugin);


// =================================================================
// 6. START EXPERIMENT 
// =================================================================

jsPsych.run(timeline);