// experiment.js
// ⭐ 最终版本：添加了详细的错误追踪和 DOM 健壮性修复 ⭐

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
// 2. PID EXTRACTION FROM URL (Simplified for Robustness)
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
// 3. INITIAL FLOW: SETUP (Same as before)
// =================================================================

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

// =================================================================
// 4. STROOP TASK DEFINITION (Same as before)
// =================================================================

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
// 5. DATA SAVING AND FINAL SCREEN FUNCTION
// =================================================================

// Helper function to render the final result screen
function renderFinalScreen(message, color, currentPid) {
    console.log("Rendering Final Screen:", message, "PID:", currentPid);
    // Clear the jsPsych display container entirely and replace with new content
    const displayElement = document.querySelector('#jspsych-display') || document.body;
    
    // Clear existing content (essential to remove jsPsych artifacts)
    displayElement.innerHTML = '';
    
    // Create and insert the final content
    const finalContent = document.createElement('div');
    finalContent.style.textAlign = 'center';
    finalContent.style.marginTop = '100px';
    finalContent.innerHTML = `
        <h2>Experiment Complete!</h2>
        <p style="color:${color}; font-size: 1.2em;"><strong>${message}</strong></p>
        <p>Your PID is: ${currentPid}</p>
        <p>You may now safely close this window.</p>
    `;
    
    // Check for the main body/display container
    const jsPsychContainer = document.querySelector('#jspsych-content') || displayElement;
    jsPsychContainer.appendChild(finalContent);
    
    // Attempt to exit fullscreen regardless
    try {
        jsPsych.pluginAPI.exitFullscreen();
    } catch (e) {
        // Do nothing
    }
}


/**
 * Sends all trial data to the PythonAnywhere Flask endpoint.
 * @param {string} currentPid - The PID is passed explicitly to ensure variable scope integrity.
 */
function save_data_to_pythonanywhere(currentPid) {
    if (!currentPid || currentPid === 'NO_PID_SET' || currentPid === 'NO_PID_FOUND') {
        console.error('CRITICAL ERROR: Aborting data save because PID is invalid:', currentPid);
        renderFinalScreen(
            'Experiment Complete, but Data NOT Saved! The participant ID (PID) was not correctly recognized. Please contact the experimenter.', 
            'red', 
            currentPid
        );
        return; 
    }

    console.log("STEP 1: Data Saving to PythonAnywhere Initiated for PID:", currentPid); 

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
            // Throw an error that includes the response status for better debugging
            throw new Error(`HTTP error! Status: ${response.status}. Full URL: ${SERVER_URL}`);
        }
        return response.json(); 
    })
    .then(data => {
        console.log("STEP 4: JSON Data Parsed. Server Status:", data.status);
        let message = '';
        let color = 'green';
        
        if (data.status === 'success') {
             message = `Data submission successful! Thank you for your participation.`;
        } else {
             message = `Data upload failed. Server error message: ${data.message}. Please contact the experimenter.`;
             color = 'red'; 
        }

        renderFinalScreen(message, color, currentPid);
    })
    .catch(error => {
        // ⭐⭐⭐ CAPTURE ANY NETWORK OR CORS ERROR HERE ⭐⭐⭐
        // If the request was blocked entirely (the issue you are facing), 
        // the error will likely be a 'TypeError: Failed to fetch' or a CORS-related error here.
        console.error('STEP FAILED: Network connection, HTTP, or JSON parsing error. Please check Console for the exact error.', error);
        
        const message = `Data Upload Error! Automatic data upload failed. This is likely due to a network security block (CORS/CSP). Error Message: ${error.message}. Please contact the experimenter (<a href="mailto:minyiwei@tamu.edu">minyiwei@tamu.edu</a>).`;
        renderFinalScreen(message, 'red', currentPid);
        
        // Return a rejected promise to ensure the error is logged even if the DOM injection failed.
        return Promise.reject(error);
    });
}

// =================================================================
// 6. START EXPERIMENT (V7 Compatible: .run() replaces .init())
// =================================================================

jsPsych.run(timeline, {
    on_finish: function() {
        console.log("JsPsych Timeline FINISHED. Executing on_finish callback.");
        save_data_to_pythonanywhere(participantId);
    }
});