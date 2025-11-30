// experiment.js

// ⭐ V7 Migration: Initialize the jsPsych instance ⭐
const jsPsych = initJsPsych({}); 

// =================================================================
// 1. CONFIGURATION AND GLOBAL VARIABLES (UPDATED)
// =================================================================

// ❗❗❗ IMPORTANT: UPDATE THIS URL ❗❗❗
// This is your PythonAnywhere data receiving route
const SERVER_URL = 'https://yiwei26.pythonanywhere.com/submit_data'; 

// Initialize PID; it will be read from the URL
let participantId = 'NO_PID_SET'; 

let timeline = [];

// =================================================================
// ⭐ 2. NEW: PID EXTRACTION FROM URL (Replaces NetID input) ⭐
// =================================================================

/**
 * Function to extract variables from URL query parameters (e.g., 'pid')
 */
function getQueryVariable(variable) {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
        const pair = vars[i].split("=");
        if (pair[0] === variable) {
            return decodeURIComponent(pair[1].replace(/\+/g, " "));
        }
    }
    return 'NO_PID_FOUND'; // If PID is not passed from Qualtrics
}

// Read PID before the experiment starts
participantId = getQueryVariable('pid'); 

// Append PID to all trial data
jsPsych.data.addProperties({
    pid: participantId, // Use 'pid' as the field name, consistent with the backend app.py check
    date_time: new Date().toLocaleString()
});

// Check if PID is missing, display error and abort if so
if (participantId === 'NO_PID_FOUND') {
    document.body.innerHTML = `
        <div style="text-align: center; margin-top: 50px; color: red;">
            <h1>Error: Missing Participant ID (PID)</h1>
            <p>Please ensure you accessed this experiment via the survey link. If you are testing, please manually append <code>?pid=TESTER_ID</code> to the URL.</p>
        </div>
    `;
    // Prevent experiment from running
    throw new Error("Missing participant ID in URL.");
}

console.log('Participant PID set to:', participantId);

// =================================================================
// 3. INITIAL FLOW: SETUP (Remove NetID trial, keep only welcome and fullscreen)
// =================================================================

// A. Welcome and Fullscreen Prompt
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

// B. Enter Fullscreen Mode
const fullscreen = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: `<p>The experiment will run in full-screen mode. Please press <strong>Continue</strong> to proceed.</p>`,
    button_label: 'Continue',
    data: { data_type: 'exclude_data', task: 'fullscreen' }
};
timeline.push(fullscreen);

// C. Stroop Task Instructions
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
// 4. STROOP TASK DEFINITION
// =================================================================

// Stimulus and Response Mapping
const inkColors = ['red', 'blue'];
const wordMeanings = ['RED', 'BLUE']; 
const responseKeys = ['r', 'b']; 

// Function to create a single Stroop trial object
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

// Generate Stimuli (40 trials: 10 repetitions of the 4 base conditions)
let base_trials = [];
inkColors.forEach((color, index) => {
    base_trials.push(create_stroop_trial(wordMeanings[index], inkColors[index], responseKeys[index])); // Congruent
    const wrong_index = (index + 1) % 2; 
    base_trials.push(create_stroop_trial(wordMeanings[wrong_index], inkColors[index], responseKeys[index])); // Incongruent
});

// Repeat the 4 base trials 10 times to get 40 total Stroop trials
let stroop_trials_full = [];
const repetition_factor = 10; 
for (let i = 0; i < repetition_factor; i++) {
    stroop_trials_full = stroop_trials_full.concat(base_trials); 
}

// Shuffle the 40 trials
const shuffled_stroop_trials = stroop_trials_full.sort(() => Math.random() - 0.5);

// Fixation cross
const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 500,
    data: { data_type: 'exclude_data', task: 'fixation' }
};

// Create the Stroop block procedure: Fixation -> Trial
let stroop_procedure = [];
shuffled_stroop_trials.forEach(trial => {
    stroop_procedure.push(fixation);
    stroop_procedure.push(trial);
});

// Add the final block to the main timeline
timeline.push({
    timeline: stroop_procedure,
    label: 'stroop_block'
});

// =================================================================
// ⭐ 5. NEW: DATA SAVING FUNCTION (POST to PythonAnywhere) ⭐
// =================================================================

/**
 * Sends all trial data to the PythonAnywhere Flask endpoint.
 * This function is called in the jsPsych.init on_finish, which is more robust.
 */
function save_data_to_pythonanywhere() {
    console.log("!!! Data Saving to PythonAnywhere Initiated !!!"); 

    // 1. Get all data and convert it to a JSON string
    // We send all data and let the backend filter it
    const data_to_send = jsPsych.data.get().json(); 
    
    // 2. Attempt to send data to PythonAnywhere
    fetch(SERVER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data_to_send,
    })
    .then(response => response.json()) // Expecting a JSON response from PythonAnywhere
    .then(data => {
        let message = '';
        let color = 'green';
        
        // Check the status returned by the server
        if (data.status === 'success') {
             // Success feedback
             message = `Data submission successful! Your Participant ID (PID) is: ${participantId}. Thank you for your participation.`;
        } else {
             // Server returned error (e.g., PID missing)
             message = `Data upload failed. Server error message: ${data.message}. Please contact the experimenter.`;
             color = 'red'; 
        }

        // Render the final success/failure screen
        document.body.innerHTML = `
            <div style="text-align: center; margin-top: 100px;">
                <h2>Experiment Complete!</h2>
                <p style="color:${color}; font-size: 1.2em;"><strong>${message}</strong></p>
                <p>You may now safely close this window.</p>
            </div>
        `;
        jsPsych.pluginAPI.exitFullscreen();
    })
    .catch(error => {
        // ⭐⭐⭐ Critical: Network/CORS Error Handling ⭐⭐⭐
        console.error('Network connection or CORS error.', error);
        
        // Render network error screen, prompt user to contact experimenter
        document.body.innerHTML = `
            <div style="text-align: center; margin-top: 100px; color: red;">
                <h2>Network Connection Error!</h2>
                <p>Automatic data upload failed. Please DO NOT close this page, and IMMEDIATELY contact the experimenter (<a href="mailto:minyiwei@tamu.edu">minyiwei@tamu.edu</a>) to ensure your data is saved!</p>
                <p><strong>Error Message:</strong> ${error.message}</p>
                <p>Your PID is: ${participantId}</p>
            </div>
        `;
        jsPsych.pluginAPI.exitFullscreen();
    });
}

// =================================================================
// 6. START EXPERIMENT 
// =================================================================

// Remove NetID trial and final_save_trial; use jsPsych.init on_finish for robust data saving.
jsPsych.init({
    timeline: timeline,
    on_finish: function() {
        save_data_to_pythonanywhere();
    }
});