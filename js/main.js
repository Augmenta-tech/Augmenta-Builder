import { Vector3 } from 'three';

import { camerasTypes, lidarsTypes } from '../designer/js/data.js';
import { Engine } from '../designer/js/Engine.js';
import { SceneManager } from '../designer/js/scene/SceneManager.js';
import { checkCameraCoherence, checkLidarCoherence, getMaxFarFromSensors } from '../designer/js/UI/Wizard.js';
import { ViewportManager } from '../designer/js/ViewportManager.js';

ViewportManager.DEFAULT_CAM_POSITION = new Vector3(5, 6, 12);
SceneManager.DEFAULT_WIDTH = 10;
const main = new Engine(true);
const sceneManager = main.viewportManager.sceneManager;

resetValues()
function resetValues()
{
    /** SETUP SECTION */
    resetSetupSection(); //Select floor

    /**Dimensions section */
    resetDimensionsSection() // Empty all inputs
}

/** VALUES FILLED THROUGH FROM */
let trackingMode;
let givenWidth;
let givenLength;
let givenHeight;
let sensorsCompatible = [];

/** SETUP SECTION */
const trackingModes = ['human-tracking', 'hand-tracking', 'wall-tracking'];

for(let i = 0; i < trackingModes.length; i++)
{
    document.getElementById('tracking-mode-' + trackingModes[i] + '-input').addEventListener('click', () => 
    {
        sceneManager.changeTrackingMode(trackingModes[i])
        document.getElementById('setup-warning-message').classList.add('hidden');
    });
}

document.getElementById('next-button-setup').addEventListener('click', () => 
{
    const trackingModeRadios = document.getElementsByName("tracking-mode-selection-builder");
    for(let i = 0; i < trackingModeRadios.length; i++)
    {
        if(trackingModeRadios[i].checked)
        {
            trackingMode = trackingModeRadios[i].value
            break;
        }
    }

    if(!trackingModes.includes(trackingMode))
    {
        document.getElementById('setup-warning-message').classList.remove('hidden');
        return;
    }
    
    if(trackingMode === "wall-tracking")
    {
        document.getElementById('dimensions-width').classList.add('hidden');
        document.getElementById('dimensions-distance-text').innerHTML = `Height (<span data-unittext="` + sceneManager.currentUnit.value + `">` + sceneManager.currentUnit.label + `</span>)`;
        document.getElementById('dimensions-distance-input').placeholder = `Height`;
    }

    document.getElementById('setup-content').classList.add('hidden');
    document.getElementById('dimensions-content').classList.remove('hidden');

    document.getElementById('dimensions-tab').classList.add('passed-tab');
});

function resetSetupSection()
{
    const trackingModeRadios = document.getElementsByName("tracking-mode-selection-builder");
    for(let i = 0; i < trackingModeRadios.length; i++)
    {
        trackingModeRadios[i].checked = trackingModeRadios[i].value === "human-tracking";
    }
}


/** DIMENSIONS SECTION */
function resetDimensionsSection()
{
    document.getElementById('dimensions-width-input').value = ''; 
    document.getElementById('dimensions-length-input').value = ''; 
    document.getElementById('dimensions-distance-input').value = ''; 
}

document.getElementById('dimensions-width-input').addEventListener('change', onChangeDimensionsInput);
document.getElementById('dimensions-length-input').addEventListener('change', onChangeDimensionsInput);
document.getElementById('dimensions-distance-input').addEventListener('change', onChangeDimensionsInput);

function onChangeDimensionsInput()
{
    const givenWidth = parseFloat(document.getElementById('dimensions-width-input').value);
    const givenLength = parseFloat(document.getElementById('dimensions-length-input').value);
    const givenHeight = parseFloat(document.getElementById('dimensions-distance-input').value);
    
    if(trackingMode === "wall-tracking" && givenLength > 0 && givenHeight > 0)
    {
        if(checkLidarCoherence(givenLength, givenHeight, sceneManager.currentUnit.value, getMaxFarFromSensors(lidarsTypes, trackingMode)))
        {
            sceneManager.updateWallYAugmentaSceneBorder(givenLength, givenHeight);
            document.getElementById('dimensions-warning-message').classList.add('hidden');
        }
        else document.getElementById('dimensions-warning-message').classList.remove('hidden');
    }
    else if(givenWidth > 0 && givenLength > 0 && givenHeight > 0)
    {
        if(checkCameraCoherence(givenHeight, sceneManager.currentUnit.value, getMaxFarFromSensors(camerasTypes, trackingMode)))
        {
            sceneManager.updateFloorAugmentaSceneBorder(document.getElementById('dimensions-width-input').value, document.getElementById('dimensions-length-input').value)
            document.getElementById('dimensions-warning-message').classList.add('hidden');
        }
        else document.getElementById('dimensions-warning-message').classList.remove('hidden');
    }
}

document.getElementById('next-button-dimensions').addEventListener('click', () => 
{
    givenWidth = parseFloat(document.getElementById('dimensions-width-input').value);
    givenLength = parseFloat(document.getElementById('dimensions-length-input').value);
    givenHeight = parseFloat(document.getElementById('dimensions-distance-input').value);
    
    if(givenWidth < 0 || givenLength < 0 || givenHeight < 0) return;

    if(trackingMode === "wall-tracking")
    {
        lidarsTypes.forEach(l => {
            if(checkLidarCoherence(givenLength, givenHeight, sceneManager.currentUnit.value, getMaxFarFromSensors([l], trackingMode)))
                { sensorsCompatible.push(l) }
        })
    }
    else
    {
        camerasTypes.forEach(c => {
            if(checkCameraCoherence(givenHeight, sceneManager.currentUnit.value, getMaxFarFromSensors([c], trackingMode)))
                { sensorsCompatible.push(c) }
        })
    }

    if(sensorsCompatible.length === 0) return;

    document.getElementById('dimensions-content').classList.add('hidden');
    document.getElementById('hardwares-content').classList.remove('hidden');

    document.getElementById('hardwares-tab').classList.add('passed-tab');
});

document.getElementById('previous-button-dimensions').addEventListener('click', () => 
{
    resetDimensionsSection();

    document.getElementById('dimensions-content').classList.add('hidden');
    document.getElementById('setup-content').classList.remove('hidden');

    document.getElementById('dimensions-tab').classList.remove('passed-tab');
});










const tabs = ['setup', 'dimensions', 'hardwares', 'my-system'];

for(let i = 2; i < tabs.length - 1; i++)
{
    document.getElementById('next-button-' + tabs[i]).addEventListener('click', () => changeTab(tabs[i], tabs[i+1], true));
    document.getElementById('previous-button-' + tabs[i+1]).addEventListener('click', () => changeTab(tabs[i+1], tabs[i], false));
}

function changeTab(fromTab, toTab, isNext)
{
    document.getElementById(fromTab + '-content').classList.add('hidden');
    document.getElementById(toTab + '-content').classList.remove('hidden');

    isNext ? 
        document.getElementById(toTab + '-tab').classList.add('passed-tab') :
        document.getElementById(fromTab + '-tab').classList.remove('passed-tab');
}
