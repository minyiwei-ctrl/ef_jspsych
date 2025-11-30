// experiment.js
// ⭐ Executive Function (EF) Battery: Includes Inhibition (Stroop), Shifting (Task Switching), and Updating (2-Back).
// ⭐ Maintains the Primitive Plugin Fix mechanism for reliable data saving.

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
// 2. PID EXTRACTION AND DATA PROPERTIES
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
            <p>Please manually add <code>?pid=YourID</code> to the end of the URL.</p>
        </div>
    `;
    throw new Error("Missing participant ID in URL.");
}

console.log('Participant PID set to:', participantId);

// =================================================================
// 3. INITIAL FLOW: SETUP AND FULLSCREEN
// =================================================================

const welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Welcome to the Executive Function Study</h2>
        <p>This experiment includes three tasks: Inhibition, Shifting, and Working Memory Updating.</p>
        <p>Please press the <strong>SPACEBAR</strong> to enter full screen and continue.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'welcome_screen' }
};
timeline.push(welcome);

const fullscreen = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: `<p>The experiment will run in full-screen mode. Please press the <strong>Continue</strong> button.</p>`,
    button_label: 'Continue',
    data: { data_type: 'exclude_data', task: 'fullscreen' }
};
timeline.push(fullscreen);

// Global fixation cross trial
const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 500,
    data: { data_type: 'exclude_data', task: 'fixation' }
};

// =================================================================
// PART A: INHIBITION (STROOP TASK)
// =================================================================

const stroop_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Task 1: Inhibition (Stroop Task)</h2>
        <p>Please identify the **COLOR** of the word, and ignore the meaning of the word itself.</p>
        <p>Use the following keys, respond **quickly and accurately**:</p>
        <ul>
            <li>Press <strong>R</strong> key if the color is <span style="color:red; font-weight:bold;">RED</span></li>
            <li>Press <strong>B</strong> key if the color is <span style="color:blue; font-weight:bold;">BLUE</span></li>
        </ul>
        <p>Press the <strong>SPACEBAR</strong> to start the Stroop task.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'stroop_instructions' }
};
timeline.push(stroop_instructions);

const stroop_colors = ['red', 'blue'];
const stroop_words = ['RED', 'BLUE']; // Using English words
const stroop_response_keys = ['r', 'b']; 

function create_stroop_trial(word_index, color_index) {
    const color = stroop_colors[color_index];
    const word = stroop_words[word_index];
    // The correct key is based on the INK COLOR (color_index)
    const correct_key = stroop_response_keys[color_index]; 
    
    const condition = (word_index === color_index) ? 'congruent' : 'incongruent';

    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="font-size: 100px; font-weight: bold; padding: 50px; color:${color};">${word}</div>`, 
        choices: stroop_response_keys,
        trial_duration: 2000, 
        data: {
            task: 'stroop',
            word_meaning: word,
            ink_color: color,
            condition: condition,
            correct_response: correct_key
        },
        on_finish: function(data) {
            data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
        }
    };
}

// Generate all combinations of word and color
let stroop_trials_base = [];
for (let c = 0; c < stroop_colors.length; c++) {
    for (let w = 0; w < stroop_words.length; w++) {
        stroop_trials_base.push(create_stroop_trial(w, c));
    }
}

// Repeat trials for a full block
let stroop_trials_full = [];
const stroop_repetition_factor = 8; 
for (let i = 0; i < stroop_repetition_factor; i++) {
    stroop_trials_full = stroop_trials_full.concat(stroop_trials_base); 
}

const shuffled_stroop_trials = jsPsych.randomization.shuffle(stroop_trials_full);

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
// PART B: SHIFTING (TASK SWITCHING)
// =================================================================

const switching_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Task 2: Shifting (Task Switching)</h2>
        <p>You will see a colored shape with a **cue word** displayed above it.</p>
        <p>You must **quickly switch** the task rule based on the cue word:</p>
        <div style="display:flex; justify-content:center; gap: 50px; margin: 30px 0;">
            <div style="border: 1px solid #ccc; padding: 15px;">
                <h3>Task 1: Color Discrimination</h3>
                <p>If the cue word is <strong>COLOR</strong>, judge the **color**:</p>
                <ul>
                    <li>Press <strong>R</strong> key if the color is <strong>Red</strong></li>
                    <li>Press <strong>B</strong> key if the color is <strong>Blue</strong></li>
                </ul>
            </div>
            <div style="border: 1px solid #ccc; padding: 15px;">
                <h3>Task 2: Shape Discrimination</h3>
                <p>If the cue word is <strong>SHAPE</strong>, judge the **shape**:</p>
                <ul>
                    <li>Press <strong>C</strong> key if the shape is a <strong>Circle</strong></li>
                    <li>Press <strong>S</strong> key if the shape is a <strong>Square</strong></li>
                </ul>
            </div>
        </div>
        <p>Press the <strong>SPACEBAR</strong> to start the Task Switching task.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'switching_instructions' }
};
timeline.push(switching_instructions);

// Task switching parameters
const switch_colors = ['red', 'blue'];
const switch_shapes = ['circle', 'square'];
const switch_cues = ['COLOR', 'SHAPE'];
const switch_keys = ['r', 'b', 'c', 's'];

function create_stimulus_html(cue, color, shape) {
    let shape_html = '';
    const style = `color: ${color}; font-size: 100px; line-height: 1;`;
    if (shape === 'circle') {
        // Use a large circle unicode character
        shape_html = `<span style="${style}">\u25CF</span>`;
    } else {
        // Use a large square unicode character
        shape_html = `<span style="${style}">\u25A0</span>`;
    }

    return `
        <div style="font-size: 30px; font-weight: bold; margin-bottom: 20px;">${cue}</div>
        <div>${shape_html}</div>
    `;
}

function calculate_correct_key(cue, color, shape) {
    if (cue === 'COLOR') {
        return color === 'red' ? 'r' : 'b';
    } else { // cue === 'SHAPE'
        return shape === 'circle' ? 'c' : 's';
    }
}

function create_switching_trial(cue, color, shape) {
    const correct_key = calculate_correct_key(cue, color, shape);
    
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: create_stimulus_html(cue, color, shape),
        choices: switch_keys,
        trial_duration: 2000,
        data: {
            task: 'task_switching',
            cue: cue,
            stim_color: color,
            stim_shape: shape,
            correct_response: correct_key
        },
        on_finish: function(data) {
            data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
        }
    };
}

// Generate all combinations for a full factorial design
function generate_switch_trials(cue_type) {
    let trials = [];
    switch_colors.forEach(color => {
        switch_shapes.forEach(shape => {
            if (cue_type === 'pure_color') {
                trials.push(create_switching_trial('COLOR', color, shape));
            } else if (cue_type === 'pure_shape') {
                trials.push(create_switching_trial('SHAPE', color, shape));
            } else if (cue_type === 'mixed') {
                switch_cues.forEach(cue => {
                    trials.push(create_switching_trial(cue, color, shape));
                });
            }
        });
    });
    return trials;
}

// --- Pure Color Block ---
const pure_color_trials = jsPsych.randomization.repeat(generate_switch_trials('pure_color'), 3);
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h2>Pure Color Block: You only respond to the COLOR now.</h2><p>Press SPACE to start.</p>',
    choices: [' '],
    data: { data_type: 'exclude_data', block_type: 'pure_color_start' }
});
pure_color_trials.forEach(trial => {
    timeline.push(fixation);
    timeline.push({...trial, data: {...trial.data, block_type: 'pure_color'}});
});

// --- Pure Shape Block ---
const pure_shape_trials = jsPsych.randomization.repeat(generate_switch_trials('pure_shape'), 3);
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h2>Pure Shape Block: You only respond to the SHAPE now.</h2><p>Press SPACE to start.</p>',
    choices: [' '],
    data: { data_type: 'exclude_data', block_type: 'pure_shape_start' }
});
pure_shape_trials.forEach(trial => {
    timeline.push(fixation);
    timeline.push({...trial, data: {...trial.data, block_type: 'pure_shape'}});
});

// --- Mixed Switching Block ---
let mixed_trials = jsPsych.randomization.repeat(generate_switch_trials('mixed'), 4);
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h2>Mixed Switching Block: You must switch rules (COLOR/SHAPE) based on the cue above.</h2><p>Press SPACE to start.</p>',
    choices: [' '],
    data: { data_type: 'exclude_data', block_type: 'mixed_start' }
});
mixed_trials.forEach((trial, index) => {
    // Add a data property to flag switch trials (switch) and repeat trials (repeat)
    const current_cue = trial.data.cue;
    const prev_cue = index > 0 ? mixed_trials[index-1].data.cue : null;
    const switch_condition = (index > 0 && current_cue !== prev_cue) ? 'switch' : 'repeat';

    timeline.push(fixation);
    timeline.push({...trial, data: {...trial.data, block_type: 'mixed_switching', switch_condition: switch_condition}});
});


// =================================================================
// PART C: UPDATING (N-BACK / 2-BACK TASK)
// =================================================================

const nback_instructions = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h2>Task 3: Updating (2-Back Task)</h2>
        <p>Your task is to determine if the <strong>CURRENT letter</strong> is the same as the letter that appeared <strong>2 trials ago</strong>.</p>
        
        <h4 style="margin-top: 30px; border-bottom: 2px solid #333; padding-bottom: 5px;">The Most Direct Flow (Positional Comparison)</h4>
        
        <table style="width: 80%; margin: 20px auto; border-collapse: collapse; text-align: center;">
            <thead>
                <tr style="background-color: #eee;">
                    <th style="border: 1px solid #ccc; padding: 10px;">Current Position (N)</th>
                    <th style="border: 1px solid #ccc; padding: 10px;">Letter to Compare (N-2)</th>
                    <th style="border: 1px solid #ccc; padding: 10px;">Simple Action</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px;">1st Letter</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">**None**</td>
                    <td style="border: 1px solid #ccc; padding: 10px; font-weight: bold;">Always press **F** (Mismatch)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px;">2nd Letter</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">**None**</td>
                    <td style="border: 1px solid #ccc; padding: 10px; font-weight: bold;">Always press **F** (Mismatch)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px;">3rd Letter</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">**1st Letter**</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">Compare Position 3 vs 1</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px;">4th Letter</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">**2nd Letter**</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">Compare Position 4 vs 2</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 10px;">5th Letter</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">**3rd Letter**</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">Compare Position 5 vs 3</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                    <td style="border: 1px solid #ccc; padding: 10px;">**...**</td>
                    <td style="border: 1px solid #ccc; padding: 10px;">**...**</td>
                    <td style="border: 1px solid #ccc; padding: 10px; font-weight: bold;">Current Position (N) ALWAYS compares to Position (N-2)</td>
                </tr>
            </tbody>
        </table>

        <p>Use the following keys:</p>
        <ul>
            <li>Press <strong>SPACEBAR</strong> if the current letter is the **SAME** as the one two trials ago (Target)</li>
            <li>Press <strong>F</strong> key if the current letter is **DIFFERENT** from the one two trials ago (Non-Target)</li>
        </ul>
        <p>Press the <strong>SPACEBAR</strong> to start the 2-Back task.</p>
    `,
    choices: [' '],
    data: { data_type: 'exclude_data', task: 'nback_instructions' }
};
timeline.push(nback_instructions);

// 2-Back task parameters
const n = 2; // 2-Back level
const nback_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const nback_keys = [' ', 'f']; // Space for match, F for mismatch
const nback_trial_count = 50; 

// Function to generate N-Back trial sequence
function generate_nback_stimuli(count, n_back) {
    let sequence = [];
    
    // Ensure at least 20% of trials are targets (matches)
    const min_matches = Math.floor(count * 0.2); 
    let current_matches = 0;
    
    for (let i = 0; i < count; i++) {
        let current_letter;
        let is_target = false;
        
        if (i < n_back) {
            // First N trials are always Non-Target (no N-back)
            current_letter = jsPsych.randomization.sampleWithoutReplacement(nback_letters, 1)[0];
            is_target = false;
        } else {
            const previous_letter = sequence[i - n_back].letter;

            // Try to generate a Target (match)
            if (current_matches < min_matches && Math.random() < 0.3) {
                current_letter = previous_letter;
                is_target = true;
                current_matches++;
            } else {
                // Generate a Non-Target (mismatch)
                let temp_letters = nback_letters.filter(l => l !== previous_letter);
                // Ensure a non-match is selected
                current_letter = jsPsych.randomization.sampleWithoutReplacement(temp_letters, 1)[0]; 
                is_target = false;
            }
        }

        const correct_response = is_target ? ' ' : 'f';

        sequence.push({
            letter: current_letter,
            is_target: is_target,
            correct_response: correct_response,
            data: {
                task: 'nback',
                n_level: n_back,
                stimulus: current_letter,
                is_target: is_target,
                correct_response: correct_response
            }
        });
    }
    return sequence;
}

const nback_sequence = generate_nback_stimuli(nback_trial_count, n);

const nback_procedure = nback_sequence.map(trial_data => {
    return [
        fixation, 
        {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: `<div style="font-size: 80px; font-weight: bold; padding: 50px;">${trial_data.letter}</div>`,
            choices: nback_keys,
            trial_duration: 3000, 
            data: trial_data.data,
            on_finish: function(data) {
                data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
            }
        }
    ];
}).flat();

timeline.push(...nback_procedure);


// =================================================================
// 4. DATA SAVING AND FINAL SCREEN FUNCTION (PRIMITIVE PLUGIN FIX - CRITICAL)
// =================================================================

// Helper function to render the final result screen
function renderFinalScreen(message, color, currentPid) {
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
        <p>You can safely close this window now.</p>
    `;
    
    displayElement.appendChild(finalContent);
    
    // Attempt to exit fullscreen regardless
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
        // Ignore errors during fullscreen exit
    }
}


/**
 * Sends data to the server and calls renderFinalScreen on success/failure.
 * Implements exponential backoff for reliable data submission.
 */
function save_and_display_data(currentPid) {
    if (!currentPid || currentPid === 'NO_PID_SET' || currentPid === 'NO_PID_FOUND') {
        renderFinalScreen(
            'Data save failed! Missing or invalid PID. Please contact the experimenter.', 
            'red', 
            currentPid
        );
        return; 
    }

    console.log("STEP 1: Data Saving Initiated via Primitive Hook for PID:", currentPid); 

    // Get only the experimental data (excluding data marked as 'exclude_data')
    const data_to_send = jsPsych.data.get().filterCustom(row => row.data_type !== 'exclude_data').json(); 
    
    // STEP 2: Initiate fetch request with exponential backoff for reliability
    let retries = 0;
    const maxRetries = 3;

    function attemptFetch() {
        fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: data_to_send,
        })
        .then(response => {
            if (!response.ok) {
                // Throw error to trigger catch block and retry mechanism
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json(); 
        })
        .then(data => {
            let message = data.status === 'success' ? 
                          `Data submission successful! Thank you for your participation.` : 
                          `Data upload failed. Server error: ${data.message}. Please contact the experimenter.`;
            let color = data.status === 'success' ? 'green' : 'red'; 
            renderFinalScreen(message, color, currentPid);
        })
        .catch(error => {
            if (retries < maxRetries) {
                const delay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
                retries++;
                // Do not log this as an error, only a warning, as it's part of the expected retry mechanism
                console.warn(`Fetch failed, retrying in ${delay / 1000}s... Attempt ${retries}/${maxRetries}`); 
                setTimeout(attemptFetch, delay);
            } else {
                console.error('CRITICAL: Fetch failed after all retries.', error);
                const message = `Data Upload Error! Automatic upload failed. Error: ${error.message}. Please contact the experimenter.`;
                renderFinalScreen(message, 'red', currentPid);
            }
        });
    }

    attemptFetch();
}

// =================================================================
// 5. PRIMITIVE FINAL PLUGIN (CRITICAL BYPASS)
// =================================================================

const primitive_final_plugin = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h2>Experiment Finished. Please wait, data is being saved...</h2><p>DO NOT close this window.</p>',
    choices: 'NO_KEYS',
    trial_duration: 1000, 
    data: { data_type: 'exclude_data', task: 'final_save_screen' },
    on_load: function(element) {
        // ⭐⭐ CRITICAL FIX: Use a small delay to escape jsPsych's trial cleanup phase
        setTimeout(() => {
             // Force exit fullscreen BEFORE data save
             try {
                jsPsych.pluginAPI.exitFullscreen();
             } catch (e) {
                 // Ignore errors
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