// experiment.js

// ⭐ V7 Migration: Initialize the jsPsych instance ⭐
const jsPsych = initJsPsych({}); 

// =================================================================
// 1. CONFIGURATION AND GLOBAL VARIABLES
// =================================================================

// !!! IMPORTANT: REPLACE THIS URL with your deployed Google Apps Script EXECUTION URL !!!
// 示例: 'https://script.google.com/macros/s/AKfycbz_xxxxxxxxxxxxxxxxxxxxxxxxxxx/exec'
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs-RW6DyQL2ucz2RF_2O6myz8JFAQYk50BUuYrftyrPsrkfyUFs5cXdR5db4g1NYK7/exec'; 

// Initialize participantId as empty; it will be set by the input trial
let participantId = ''; 

let timeline = [];

// =================================================================
// 2. INITIAL FLOW: NETID INPUT AND SETUP
// =================================================================

// A. Input NetID Trial
const netid_input_trial = {
    type: jsPsychSurveyHtmlForm, 
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
// 3. STROOP TASK DEFINITION
// =================================================================

// Stimulus and Response Mapping
const inkColors = ['red', 'blue'];
const wordMeanings = ['RED', 'BLUE']; 
const responseKeys = ['r', 'b']; // 'r' for red, 'b' for blue

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
            // Updated response mapping: 'r' -> 'red', 'b' -> 'blue'
            data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
            data.response_label = data.response === 'r' ? 'red' : (data.response === 'b' ? 'blue' : 'miss');
        }
    };
}

// Generate Stimuli (40 trials: 10 repetitions of the 4 base conditions)
let base_trials = [];
inkColors.forEach((color, index) => {
    // Correct response key is taken from the 'r' or 'b' based on index (0 or 1)
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
// 4. DATA SAVING FUNCTION (POST with Download Fallback)
// =================================================================

/**
 * Sends all trial data to the Google Apps Script endpoint.
 * If fetch fails (due to CORS/Network), it prompts the user to download the data as a CSV file.
 */
function save_data() {
    // Critical debug log: Confirm the function was executed
    console.log("!!! SAVE DATA FUNCTION CALLED !!!"); 

    // 1. Get all trial data
    const trials_data = jsPsych.data.get()
        .filter({data_type: 'trial_data'});
        
    const trials_array = trials_data.values(); 
    
    // 2. Build the POST request body
    const request_body = {
        participant: participantId, 
        data: trials_array 
    };
    
    // 3. Attempt to send data to Google Apps Script
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request_body),
    })
    .then(response => response.text()) 
    .then(result => {
        // Successful path (Only happens if CORS is bypassed, e.g., local run or proper server)
        console.log('Apps Script returned RAW result:', result);
        
        let message = '';
        let color = 'green';
        if (result.trim() === 'Success') {
             message = 'Data upload successful! Thank you for your participation.';
        } else {
             // Apps Script returned an unexpected message
             message = `Data upload failed. Apps Script returned: "${result}". Please contact the experimenter.`;
             color = 'orange'; 
        }

        // Render the final finished screen for success/soft error
        document.querySelector('.jspsych-content').innerHTML = `
            <h2>Experiment Finished!</h2>
            <p style="color:${color};"><strong>${message}</strong></p>
            <p>You may now safely close this window.</p>
        `;
        jsPsych.pluginAPI.exitFullscreen();
    })
    .catch(error => {
        // ⭐⭐⭐ Critical: Data Upload Failed (Likely CORS/Network Issue) ⭐⭐⭐
        console.error('Network Error during data transfer. Initiating data download.', error);
        
        // Convert collected data to CSV format
        const data_csv = jsPsych.data.get().csv(); // Use jsPsych.data.get().csv() to ensure all data is captured
        const filename = `${participantId}_stroop_data.csv`;
        
        // Create a downloadable Blob object
        const blob = new Blob([data_csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        // Render the fallback screen with download instructions
        document.querySelector('.jspsych-content').innerHTML = `
            <h2>Experiment Finished!</h2>
            <p style="color:red;"><strong>CRITICAL ERROR: Data upload failed due to network security limits (CORS).</strong></p>
            <p>To ensure your data is recorded, please click the button below to **download your data file**.</p>
            <p>Then, attach the file named **${filename}** to an email and send it to the experimenter at **[minyiwei@tamu.edu]**.</p>
            
            <a href="${url}" download="${filename}" class="jspsych-btn" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                **Click to Download Data File**
            </a>
            <p style="margin-top: 20px;">You may close this page after downloading the file and sending the email.</p>
        `;
        jsPsych.pluginAPI.exitFullscreen();
    });
}

// =================================================================
// 5. FINAL SAVE TRIAL (Force execution of save_data)
// =================================================================

// This is an extra trial to ensure save_data() is called even if the flow is interrupted.
const final_save_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<p style="font-size: 24px;">Processing data...</p>',
    choices: "NO_KEYS",
    trial_duration: 500, // Display for 0.5 seconds
    data: { data_type: 'exclude_data', task: 'final_save_prompt' },
    on_finish: function() {
        save_data(); // Manual call to the save function
    }
};

timeline.push(final_save_trial); // Add to the end of the timeline

// =================================================================
// 6. START EXPERIMENT
// =================================================================

jsPsych.run(timeline);