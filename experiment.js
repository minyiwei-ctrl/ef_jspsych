// experiment.js

// ⭐ V7 Migration: Initialize the jsPsych instance ⭐
const jsPsych = initJsPsych({}); 

// =================================================================
// 1. CONFIGURATION AND GLOBAL VARIABLES
// =================================================================

// !!! IMPORTANT: REPLACE THIS URL with your deployed Google Apps Script URL !!!
// Use the new, fresh Execution URL from your Apps Script deployment
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs-RW6DyQL2ucz2RF_2O6myz8JFAQYk50BUuYrftyrPsrkfyUFs5cXdR5db4g1NYK7/exec'; // <--- PASTE NEW URL

// Initialize participantId as empty; it will be set by the input trial
let participantId = ''; 

let timeline = [];

// =================================================================
// 2. INITIAL FLOW: NETID INPUT AND SETUP
// =================================================================

// A. Input NetID Trial
const netid_input_trial = {
    // ⭐ V7/Path Fix: Using SurveyHtmlForm plugin ⭐
    type: jsPsychSurveyHtmlForm, 
    
    // ⭐ V7 Fix: Using 'html' parameter to define form structure ⭐
    html: `
        <h2>Welcome to the Executive Function Study</h2>
        <p>Please enter your <strong>NetID (Student ID)</strong> to begin. This ID will link your experiment data with other records.</p>
        <div style="text-align: left; margin: 20px auto; width: 300px;">
            <label for="net_id">NetID:</label><br>
            <input type="text" id="net_id" name="net_id" required placeholder="e.g., U1234567" style="width: 100%;">
        </div>
    `,
    
    button_label: 'Continue',
    
    data: { data_type: 'exclude_data', task: 'netid_input' }, 
    
    on_finish: function(data) {
        // V7: SurveyHtmlForm returns an object
        const response_data = data.response; 
        const netid = response_data.net_id;
        
        participantId = netid;
        
        jsPsych.data.addProperties({
            participant: participantId,
            date_time: new Date().toLocaleString()
        });

        if (!netid || netid.length < 5) {
             jsPsych.endExperiment('Experiment terminated due to invalid or missing NetID.');
        }
        
        console.log('Participant NetID set to:', participantId);
    }
};
timeline.push(netid_input_trial);

// B. Welcome and Fullscreen Prompt
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

// C. Enter Fullscreen Mode
const fullscreen = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: `<p>The experiment will run in full-screen mode. Please press <strong>Continue</strong> to proceed.</p>`,
    button_label: 'Continue',
    data: { data_type: 'exclude_data', task: 'fullscreen' }
};
timeline.push(fullscreen);

// D. Stroop Task Instructions
const stroop_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Task Instructions: Stroop Task</h2>
        <p>Please judge the **COLOR** of the word, ignoring the word's meaning.</p>
        <p>Respond **as quickly and accurately as possible** using these keys:</p>
        <ul>
            <li>Press <strong>F</strong> key if the color is <span style="color:red; font-weight:bold;">RED</span></li>
            <li>Press <strong>J</strong> key if the color is <span style="color:blue; font-weight:bold;">BLUE</span></li>
        </ul>
        <p>Press the <strong>SPACEBAR</strong> to start the task.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'instructions' }
};
timeline.push(stroop_instructions);

// =================================================================
// 3. STROOP TASK DEFINITION
// =================================================================

// Stimulus and Response Mapping
const inkColors = ['red', 'blue'];
const wordMeanings = ['RED', 'BLUE']; 
const responseKeys = ['f', 'j']; 

// Function to create a single Stroop trial object
function create_stroop_trial(word, color, correct_key) {
    const condition = (word === (color === 'red' ? 'RED' : 'BLUE')) ? 'congruent' : 'incongruent';

    return {
        type: jsPsychHtmlKeyboardResponse,
        // Using inline styling to ensure display if external CSS fails
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
            data.response_label = data.response === 'f' ? 'red' : (data.response === 'j' ? 'blue' : 'miss');
        }
    };
}

// Generate Stimuli (40 trials: 10 repetitions of the 4 base conditions)

let base_trials = [];

// Congruent trials (2 types)
inkColors.forEach((color, index) => {
    base_trials.push(create_stroop_trial(wordMeanings[index], inkColors[index], responseKeys[index]));
});

// Incongruent trials (2 types)
inkColors.forEach((color, index) => {
    const wrong_index = (index + 1) % 2; 
    base_trials.push(create_stroop_trial(wordMeanings[wrong_index], inkColors[index], responseKeys[index]));
});

// ⭐ FIX: Repeat the 4 base trials 10 times to get 40 total Stroop trials ⭐
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
// 4. DATA SAVING FUNCTION (POST to Google Apps Script)
// =================================================================

/**
 * Sends all trial data to the Google Apps Script endpoint.
 * Includes robust logging and error handling to prevent white screen issues.
 */
function save_data() {
    // ⭐ 关键：强制日志 (必须是函数内的第一行可执行语句) ⭐
    console.log("!!! SAVE DATA FUNCTION CALLED !!!"); 

    // 1. Filter and get only the relevant trial data
    const trials_array = jsPsych.data.get()
        .filter({data_type: 'trial_data'})
        .values(); 
    
    // 2. Build the POST request body matching the Apps Script structure
    const request_body = {
        participant: participantId, 
        data: trials_array 
    };
    
    // 3. Send the data
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request_body),
    })
    .then(response => response.text()) 
    .then(result => {
        // Logging: Print the raw result for debugging (Crucial for white screen fix)
        console.log('Apps Script returned RAW result:', result);
        
        let message = '';
        let color = 'red';
        
        // Fault Tolerance: Check for "Success" but display a message regardless of strict success
        if (result.trim() === 'Success') {
             message = 'Data upload successful! Thank you for your participation.';
             color = 'green';
        } else {
             // If Apps Script returns anything else (e.g., "Error: ..."), display it instead of blank screen
             message = `Data upload failed. Apps Script returned: "${result}". Please contact the experimenter.`;
             color = 'orange'; 
        }

        // Render the final finished screen
        document.querySelector('.jspsych-content').innerHTML = `
            <h2>Experiment Finished!</h2>
            <p style="color:${color};"><strong>${message}</strong></p>
            <p>You may now safely close this window.</p>
        `;
        jsPsych.pluginAPI.exitFullscreen();
    })
    .catch(error => {
        // Critical network error: Display immediate instruction to the user
        console.error('Network Error during data transfer:', error);
        document.querySelector('.jspsych-content').innerHTML = `
            <h2>Experiment Finished!</h2>
            <p style="color:red;"><strong>CRITICAL ERROR: Could not connect to the data server.</strong></p>
            <p>DO NOT close this page. Please contact the experimenter immediately.</p>
        `;
    });
}

// =================================================================
// 5. FINAL SAVE TRIAL (Force execution of save_data)
// =================================================================

// This trial is added to the end of the timeline to ensure save_data() is called
const final_save_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<p style="font-size: 24px;">Processing data...</p>',
    choices: "NO_KEYS",
    trial_duration: 500, // Show for 0.5 seconds
    data: { data_type: 'exclude_data', task: 'final_save_prompt' },
    on_finish: function() {
        save_data(); // Manual call to the save function
    }
};

timeline.push(final_save_trial); // Add to the end of the timeline

