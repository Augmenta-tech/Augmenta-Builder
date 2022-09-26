import { Vector3 } from 'three';

import { camerasTypes, lidarsTypes } from '../designer/js/data.js';
import { Engine } from '../designer/js/Engine.js';
import { SceneManager } from '../designer/js/scene/SceneManager.js';
import { calculateCameraConfig, calculateLidarConfig, checkCameraCoherence, checkLidarCoherence, createSceneFromCameraConfig, createSceneFromLidarConfig, getMaxFarFromSensors } from '../designer/js/UI/Wizard.js';
import { ViewportManager } from '../designer/js/ViewportManager.js';

ViewportManager.DEFAULT_CAM_POSITION = new Vector3(-2, 8, 10);
SceneManager.DEFAULT_WIDTH = 10;
const main = new Engine(true);
const sceneManager = main.viewportManager.sceneManager;

/** VALUES FILLED THROUGH FROM */
let trackingMode;
let inputWidth;
let inputLength;
let inputHeight;
let sensorsCompatible = [];
let usedSensor;

resetValues()

function resetValues()
{
    /** SETUP SECTION */
    resetSetupSection(); //Select floor

    /**Dimensions section */
    // Empty all inputs
    document.getElementById('dimensions-width-input').value = ''; 
    document.getElementById('dimensions-length-input').value = ''; 
    document.getElementById('dimensions-distance-input').value = '';
    resetDimensionsSection();

    /** Hardware section */
    resetHardwareSection(); //select indoor and empty sensors div
}


/** HANDY FUNCTIONS */
function deleteAllChildren(element)
{
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/** SETUP SECTION */
function resetSetupSection()
{
    const trackingModeRadios = document.getElementsByName("tracking-mode-selection-builder");
    for(let i = 0; i < trackingModeRadios.length; i++)
    {
        trackingModeRadios[i].checked = trackingModeRadios[i].value === "human-tracking";
    }
}

const trackingModes = ['human-tracking', 'hand-tracking', 'wall-tracking'];

for(let i = 0; i < trackingModes.length; i++)
{
    document.getElementById('tracking-mode-' + trackingModes[i] + '-input').addEventListener('click', () => 
    {
        sceneManager.changeTrackingMode(trackingModes[i])
        document.getElementById('setup-warning-message').classList.add('hidden');
    });
}

document.getElementById('tracking-mode-advanced').addEventListener('click', () => {
    const trackingModeChoices = document.getElementById('tracking-mode-selection-builder').children;
    for(let i = 0; i < trackingModeChoices.length; i++)
    {
        trackingModeChoices[i].classList.remove('hidden');
    }
    document.getElementById('tracking-mode-advanced').classList.add('hidden');
});

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
        document.getElementById('dimensions-length').classList.add('hidden');
        document.getElementById('dimensions-distance-text-default').classList.add('hidden');
        document.getElementById('dimensions-distance-text-wall-tracking').classList.remove('hidden');
        document.getElementById('dimensions-distance-input').placeholder = `Height`;
    }
    
    onChangeDimensionsInput();

    document.getElementById('setup-content').classList.add('hidden');
    document.getElementById('dimensions-content').classList.remove('hidden');

    document.getElementById('dimensions-tab').classList.add('passed-tab');
});


/** DIMENSIONS SECTION */
function resetDimensionsSection()
{
    document.getElementById('dimensions-length').classList.remove('hidden');
    document.getElementById('dimensions-distance-text-default').classList.remove('hidden');
    document.getElementById('dimensions-distance-text-wall-tracking').classList.add('hidden');
    document.getElementById('dimensions-distance-input').placeholder = `Sensor height`;

    document.getElementById('dimensions-warning-message').classList.add('hidden');
}

document.getElementById('dimensions-width-input').addEventListener('change', onChangeDimensionsInput);
document.getElementById('dimensions-length-input').addEventListener('change', onChangeDimensionsInput);
document.getElementById('dimensions-distance-input').addEventListener('change', onChangeDimensionsInput);

function onChangeDimensionsInput()
{
    const inputSceneWidth = parseFloat(document.getElementById('dimensions-width-input').value);
    const inputSceneLength = parseFloat(document.getElementById('dimensions-length-input').value);
    const inputSceneHeight = parseFloat(document.getElementById('dimensions-distance-input').value);
    
    if(trackingMode === "wall-tracking" && inputSceneWidth > 0 && inputSceneHeight > 0)
    {
        if(checkLidarCoherence(inputSceneWidth, inputSceneHeight, sceneManager.currentUnit.value, getMaxFarFromSensors(lidarsTypes.filter(l => l.recommended), trackingMode)))
        {
            sceneManager.updateWallYAugmentaSceneBorder(inputSceneWidth, inputSceneHeight);
            document.getElementById('dimensions-warning-message').classList.add('hidden');
        }
        else document.getElementById('dimensions-warning-message').classList.remove('hidden');
    }
    else if(inputSceneWidth > 0 && inputSceneLength > 0)
    {
        sceneManager.updateFloorAugmentaSceneBorder(inputSceneWidth, inputSceneLength);
        if(inputSceneHeight > 0)
        {
            if(checkCameraCoherence(inputSceneHeight, sceneManager.currentUnit.value, getMaxFarFromSensors(camerasTypes.filter(c => c.recommended), trackingMode)))
            {
                document.getElementById('dimensions-warning-message').classList.add('hidden');
            }
            else document.getElementById('dimensions-warning-message').classList.remove('hidden');
        }
    }
}

document.getElementById('next-button-dimensions').addEventListener('click', () => 
{
    inputWidth = parseFloat(document.getElementById('dimensions-width-input').value);
    inputLength = parseFloat(document.getElementById('dimensions-length-input').value);
    inputHeight = parseFloat(document.getElementById('dimensions-distance-input').value);
    
    if(inputWidth < 0 || inputLength < 0 || inputHeight < 0) return;

    if(trackingMode === "wall-tracking")
    {
        lidarsTypes.filter(l => l.recommended).forEach(l => {
            if(checkLidarCoherence(inputWidth, inputHeight, sceneManager.currentUnit.value, getMaxFarFromSensors([l], trackingMode)))
                { sensorsCompatible.push(l) }
        })
    }
    else
    {
        camerasTypes.filter(c => c.recommended).forEach(c => {
            if(checkCameraCoherence(inputHeight, sceneManager.currentUnit.value, getMaxFarFromSensors([c], trackingMode)))
                { sensorsCompatible.push(c) }
        })
    }

    if(sensorsCompatible.length === 0) return;

    const sensorsDiv = document.getElementById('hardware-sensors-selection');
    sensorsCompatible.forEach(s => {
        const sensorChoice = document.createElement('label');
        sensorChoice.id = "hardware-input-" + s.textId;
        sensorChoice.classList.add("hardware-sensors-type", "hardware-radio-label");

        sensorChoice.innerHTML = `
            <input id="` + s.textId + `" type="radio" name="sensor-choice" value="` + s.textId + `">
            <div class="row center-x center-y hardware-switch">
            <p>` + s.name + `</p>
            </div>`;
        sensorsDiv.appendChild(sensorChoice);
    });

    bindHardwareEventListeners(sensorsDiv.children)
    
    sensorsDiv.children[0].dispatchEvent(new Event('click'));
    sensorsDiv.children[0].children[0].checked = true;

    document.getElementById('dimensions-content').classList.add('hidden');
    document.getElementById('hardware-content').classList.remove('hidden');

    document.getElementById('hardware-tab').classList.add('passed-tab');
});

document.getElementById('previous-button-dimensions').addEventListener('click', () => 
{
    resetDimensionsSection();

    document.getElementById('dimensions-content').classList.add('hidden');
    document.getElementById('setup-content').classList.remove('hidden');

    document.getElementById('dimensions-tab').classList.remove('passed-tab');
});


/** HARDWARES SECTION */
function resetHardwareSection()
{
    sceneManager.objects.removeSensors();

    sensorsCompatible.length = 0;
    deleteAllChildren(document.getElementById('hardware-sensors-selection'));

    document.getElementById('hardware-input-radio-indoor').checked = true;
    document.getElementById('hardware-input-radio-outdoor').checked = false;

    document.getElementById('hardware-warning-message').classList.add('hidden');
}

function bindHardwareEventListeners(sensorsElements)
{
    // Switch indoor-outdoor events
    const switchElement = document.getElementById('hardware-switch-indoor-outdoor');
    const switchInputs = switchElement.querySelectorAll('input');
    for(let i = 0; i < switchInputs.length; i++)
    {
        switchInputs[i].addEventListener('click', () => {
            let disabledSensorsNumber = 0;
            sensorsCompatible.forEach(s => {
                if(s.canBeUsed.includes(switchInputs[i].value)){
                    document.getElementById(s.textId).disabled = false;
                    document.getElementById("hardware-input-" + s.textId).classList.remove("unselectable");
                }
                else{
                    document.getElementById(s.textId).disabled = true;
                    document.getElementById("hardware-input-" + s.textId).classList.add("unselectable")
                    document.getElementById(s.textId).checked = false;

                    disabledSensorsNumber++;
                }
            });
            if(sensorsCompatible.length === disabledSensorsNumber){
                document.getElementById('hardware-warning-message').classList.remove('hidden');
            }
            else document.getElementById('hardware-warning-message').classList.add('hidden');
        });
    }

    //Click on sensor events
    for(let i = 0; i < sensorsElements.length; i++)
    {
        if(!sensorsElements[i].disabled)
        {
            sensorsElements[i].addEventListener('click', () => {
                const sensorInput = sensorsElements[i].querySelector('input');
                if(!sensorInput.disabled && !sensorInput.checked)
                {
                    const sensorTextId = sensorsElements[i].id.substring("hardware-input-".length);

                    const givenWidth = Math.ceil(inputWidth / sceneManager.currentUnit.value * 100) / 100;
                    const givenLength = Math.ceil(inputLength / sceneManager.currentUnit.value * 100) / 100;
                    const givenHeight = Math.ceil(inputHeight / sceneManager.currentUnit.value * 100) / 100;

                    //on click on a sensor, display the scene calculated with this sensor
                    switch(trackingMode)
                    {
                        case 'wall-tracking':
                        {
                            const sensor = lidarsTypes.find(sensorType => sensorType.textId === sensorTextId);
                            const config = calculateLidarConfig(sensor, givenWidth, givenHeight);
                            if(!config){
                                console.error('no config found with this setup');
                                return;
                            }
                            sceneManager.objects.removeSensors();
                            createSceneFromLidarConfig(config, sceneManager);
                            break;
                        }
                        case 'human-tracking':
                        case 'hand-tracking':
                        {
                            const sensor = camerasTypes.find(sensorType => sensorType.textId === sensorTextId);
                            let overlapHeightDetection = trackingMode === 'human-tracking' ? SceneManager.DEFAULT_DETECTION_HEIGHT : SceneManager.HAND_TRACKING_OVERLAP_HEIGHT;
                            const config = calculateCameraConfig(trackingMode, sensor, givenWidth, givenLength, givenHeight, overlapHeightDetection);
                            if(!config){
                                console.error('no config found with this setup');
                                return;
                            }
                            sceneManager.objects.removeSensors();
                            createSceneFromCameraConfig(config, trackingMode, givenWidth, givenLength, givenHeight + sceneManager.sceneElevation, sceneManager);
                            break;
                        }
                        default:
                            break;
                    }
                }
            });
        }
    }
}

document.getElementById('next-button-hardware').addEventListener('click', () => 
{
    const sensorsRadios = document.getElementsByName("sensor-choice");
    let unselectedRadios = 0;
    for(let i = 0; i < sensorsRadios.length; i++)
    {
        if(!sensorsRadios[i].checked) unselectedRadios++;
        else usedSensor = camerasTypes.concat(lidarsTypes).find(sensorType => sensorType.textId === sensorsRadios[i].value);
    }
    if(unselectedRadios === sensorsRadios.length) return;

    // fill "My system" section
    /* Tracking Mode */
    const mySystemTrackingMode = document.getElementById("tracking-mode-" + trackingMode + "-input").cloneNode(true);
    mySystemTrackingMode.id += '-copy';
    mySystemTrackingMode.children[0].checked = false;
    mySystemTrackingMode.children[0].disabled = true;
    document.getElementById('my-system-tracking-mode').appendChild(mySystemTrackingMode);

    /* Dimensions */
    const mySystemDimensions = document.getElementById('dimensions-inputs').cloneNode(true);
    mySystemDimensions.id += 'copy';
    mySystemDimensions.classList.remove('row');
    mySystemDimensions.classList.add('column');
    const dimensionsInputs = mySystemDimensions.getElementsByTagName("input");
    for(let i = 0; i < dimensionsInputs.length; i++)
    {
        dimensionsInputs[i].readOnly = true;
    }
    document.getElementById('my-system-dimensions').appendChild(mySystemDimensions);

    /* Hardware */
    const mySystemHardware = document.getElementById('hardware-input-' + usedSensor.textId).cloneNode(true);
    mySystemHardware.id += '-copy';
    mySystemHardware.children[0].checked = false;
    mySystemHardware.children[0].disabled = true;
    document.getElementById('my-system-hardware').appendChild(mySystemHardware);
    
    /* Recap */
    const recapDiv = document.getElementById('my-system-recap');
    const nbSensors = sceneManager.objects.getNbSensors();

    const sensorInfo = document.createElement('p');
    sensorInfo.innerHTML = `x` + nbSensors + ` ` + usedSensor.name;
    recapDiv.appendChild(sensorInfo);

    if(trackingMode !== 'wall-tracking')
    {
        const nodeInfo = document.createElement('p');
        nodeInfo.innerHTML = `x` + nbSensors + ` Augmenta Node`;
        recapDiv.appendChild(nodeInfo)
        
        const hookInfo = document.createElement('p');
        hookInfo.innerHTML = `x` + nbSensors + ` Hook`;
        recapDiv.appendChild(hookInfo)
    }

    document.getElementById('hardware-content').classList.add('hidden');
    document.getElementById('my-system-content').classList.remove('hidden');

    document.getElementById('my-system-tab').classList.add('passed-tab');
});

document.getElementById('previous-button-hardware').addEventListener('click', () => 
{
    resetHardwareSection();

    document.getElementById('hardware-content').classList.add('hidden');
    document.getElementById('dimensions-content').classList.remove('hidden');

    document.getElementById('hardware-tab').classList.remove('passed-tab');
});


/** MY SYTEM SECTION */
function resetMySystemSection()
{
    deleteAllChildren(document.getElementById('my-system-tracking-mode'));
    deleteAllChildren(document.getElementById('my-system-dimensions'));
    deleteAllChildren(document.getElementById('my-system-hardware'));
    deleteAllChildren(document.getElementById('my-system-recap'));
}

document.getElementById('previous-button-my-system').addEventListener('click', () => 
{
    resetMySystemSection();
    
    const sensorsDiv = document.getElementById('hardware-sensors-selection');

    document.getElementById('my-system-content').classList.add('hidden');
    document.getElementById('hardware-content').classList.remove('hidden');

    document.getElementById('my-system-tab').classList.remove('passed-tab');
});







/** TO CHECK IF HAS A CLASS (click on tabs passed ?) */
// document.getElementById('setup-tab').classList.contains("passed-tab"))


