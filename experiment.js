// experiment.js

// ⭐ V7 Migration: Initialize the jsPsych instance ⭐
const jsPsych = initJsPsych({}); 

// =================================================================
// 1. CONFIGURATION AND GLOBAL VARIABLES
// =================================================================

// !!! IMPORTANT: REPLACE THIS URL with your deployed Google Apps Script URL !!!
const APPS_SCRIPT_URL = 'hhttps://script.google.com/macros/s/AKfycbzVXGb-jLr32N2ypZhdZxnKHDeU2YhL9XN56zBYvhoa1-BOS1IRCWlD1lrbY12bUKjO/exec';

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
    
    // ⭐ V7 Fix: Using 'html' parameter to define form structure, resolving the 'null' rendering issue ⭐
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
        // ⭐ V7 Fix: SurveyHtmlForm returns an object, remove JSON.parse() ⭐
        const response_data = data.response; 
        const netid = response_data.net_id; // Get the entered ID
        
        // 1. Store the ID globally
        participantId = netid;
        
        // 2. Add the ID as a property to ALL subsequent trials
        jsPsych.data.addProperties({
            participant: participantId,
            date_time: new Date().toLocaleString()
        });

        if (!netid || netid.length < 5) {
             // Simple validation: If ID is too short, end the experiment
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
        stimulus: `<div class="stroop-stimulus" style="color:${color};">${word}</div>`, 
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
let base_trials = []; // Use a temporary array for the 4 base types

// Congruent trials
inkColors.forEach((color, index) => {
    base_trials.push(create_stroop_trial(wordMeanings[index], inkColors[index], responseKeys[index]));
});

// Incongruent trials
inkColors.forEach((color, index) => {
    const wrong_index = (index + 1) % 2; 
    base_trials.push(create_stroop_trial(wordMeanings[wrong_index], inkColors[index], responseKeys[index]));
});

// ⭐  4 base X 10 times，total 40 times ⭐
let stroop_trials_full = [];
const repetition_factor = 10; 
for (let i = 0; i < repetition_factor; i++) {
    stroop_trials_full = stroop_trials_full.concat(base_trials); 
}

// Shuffle the 40 trials (V7 Fix)
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
 */
function save_data() {
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
        // ⭐ print: Apps Script's actual data ⭐
        console.log('Apps Script returned RAW result:', result);
        
        let message = '';
        let color = 'red';
        
        // ⭐ Fault tolerance: even if the return content is not strictly "Success", the message will be displayed ⭐
        if (result.trim() === 'Success') {
             message = 'Data upload successful! Thank you for your participation.';
             color = 'green';
        } else {
             // If something other than "Success" is returned, display it instead of a white screen
             message = `Data upload failed. Apps Script returned: "${result}". Please contact the experimenter.`;
             color = 'orange'; 
        }

        // finish message
        document.querySelector('.jspsych-content').innerHTML = `
            <h2>Experiment Finished!</h2>
            <p style="color:${color};"><strong>${message}</strong></p>
            <p>You may now safely close this window.</p>
        `;
        jsPsych.pluginAPI.exitFullscreen();
    })
    .catch(error => {
        console.error('Network Error during data transfer:', error);
        document.querySelector('.jspsych-content').innerHTML = `
            <h2>Experiment Finished!</h2>
            <p style="color:red;"><strong>CRITICAL ERROR: Could not connect to the data server.</strong></p>
            <p>DO NOT close this page. Please contact the experimenter immediately.</p>
        `;
    });
}