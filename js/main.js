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

/** RESTORE SESSION */
restoreSession();

function restoreSession()
{
    const builderStep = sessionStorage.getItem('builderStep');
    if(builderStep)
    {
        initSetupSection();
        if(builderStep <= 0) return;
        else
        {
            initDimensionsSection();
        }
        if(builderStep <= 1) 
        {
            document.getElementById('setup-content').classList.add('hidden');
            document.getElementById('dimensions-content').classList.remove('hidden');

            document.getElementById('dimensions-tab').classList.add('passed-tab');
            return;
        }
        else 
        {
            getDimensions();
            initHardwareSection();
            selectUsedSensor();
        }
        if(builderStep <= 2)
        {
            document.getElementById('setup-content').classList.add('hidden');
            document.getElementById('hardware-content').classList.remove('hidden');

            document.getElementById('dimensions-tab').classList.add('passed-tab');
            document.getElementById('hardware-tab').classList.add('passed-tab');
            return;
        }
        else
        {
            getHardware();
            initMySystemSection();
        }
        if(builderStep <= 3)
        {
            document.getElementById('setup-content').classList.add('hidden');
            document.getElementById('my-system-content').classList.remove('hidden');

            document.getElementById('dimensions-tab').classList.add('passed-tab');
            document.getElementById('hardware-tab').classList.add('passed-tab');
            document.getElementById('my-system-tab').classList.add('passed-tab');
            return;
        }

    }
    else{
        sessionStorage.setItem('builderStep', 0);
    }
}

/** HANDY FUNCTIONS */
function deleteAllChildren(element)
{
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/** SETUP SECTION */
function initSetupSection()
{
    const sceneInfos = sessionStorage.getItem('sceneInfos');
    if(sceneInfos) trackingMode = JSON.parse(sceneInfos).trackingMode;
    /*
    const trackingModeRadios = document.getElementsByName("tracking-mode-selection-builder");
    for(let i = 0; i < trackingModeRadios.length; i++)
    {
        trackingModeRadios[i].checked = (trackingModeRadios[i].value === (trackingMode ? trackingMode : "human-tracking"));
    }
    if(trackingMode && sceneManager.augmentaSceneLoaded) sceneManager.changeTrackingMode(trackingMode)*/
}

const trackingModeRadios = document.getElementsByName("tracking-mode-selection-builder");
for(let i = 0; i < trackingModeRadios.length; i++)
{
    trackingModeRadios[i].addEventListener('click', () => 
    {
        sceneManager.changeTrackingMode(trackingModeRadios[i].value)
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

    if(!trackingMode)
    {
        document.getElementById('setup-warning-message').classList.remove('hidden');
        return;
    }
    
    initDimensionsSection();

    document.getElementById('setup-content').classList.add('hidden');
    document.getElementById('dimensions-content').classList.remove('hidden');

    document.getElementById('dimensions-tab').classList.add('passed-tab');

    sessionStorage.setItem('builderStep', 1);
});


/** DIMENSIONS SECTION */
function resetDimensionsSection()
{
    inputWidth = undefined;
    inputLength = undefined;
    inputHeight = undefined;

    document.getElementById('dimensions-length').classList.remove('hidden');
    document.getElementById('dimensions-distance-text-default').classList.remove('hidden');
    document.getElementById('dimensions-distance-text-wall-tracking').classList.add('hidden');
    document.getElementById('dimensions-distance-input').placeholder = `Sensor height`;

    document.getElementById('dimensions-warning-message').classList.add('hidden');
}

document.getElementById('dimensions-width-input').addEventListener('change', onChangeDimensionsInput);
document.getElementById('dimensions-length-input').addEventListener('change', onChangeDimensionsInput);
document.getElementById('dimensions-distance-input').addEventListener('change', onChangeDimensionsInput);

function initDimensionsSection()
{
    if(trackingMode === "wall-tracking")
    {
        document.getElementById('dimensions-length').classList.add('hidden');
        document.getElementById('dimensions-distance-text-default').classList.add('hidden');
        document.getElementById('dimensions-distance-text-wall-tracking').classList.remove('hidden');
        document.getElementById('dimensions-distance-input').placeholder = `Height`;
    }
}

function onChangeDimensionsInput()
{
    const inputSceneWidth = parseFloat(document.getElementById('dimensions-width-input').value);
    const inputSceneLength = parseFloat(document.getElementById('dimensions-length-input').value);
    const inputSceneHeight = parseFloat(document.getElementById('dimensions-distance-input').value);
    
    if(trackingMode === "wall-tracking" && inputSceneWidth && inputSceneHeight)
    {
        if(checkLidarCoherence(inputSceneWidth, inputSceneHeight, sceneManager.currentUnit.value, getMaxFarFromSensors(lidarsTypes.filter(l => l.recommended), trackingMode)))
        {
            sceneManager.updateWallYAugmentaSceneBorder(inputSceneWidth, inputSceneHeight);
            document.getElementById('dimensions-warning-message').classList.add('hidden');
        }
        else document.getElementById('dimensions-warning-message').classList.remove('hidden');
    }
    else if(inputSceneWidth && inputSceneLength)
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

function getDimensions()
{
    inputWidth = parseFloat(document.getElementById('dimensions-width-input').value);
    inputLength = parseFloat(document.getElementById('dimensions-length-input').value);
    inputHeight = parseFloat(document.getElementById('dimensions-distance-input').value);
}

document.getElementById('next-button-dimensions').addEventListener('click', () => 
{
    getDimensions()
    
    if((trackingMode !== 'wall-tracking' && ( !inputWidth || !inputLength || !inputHeight)) || 
        (trackingMode === 'wall-tracking' && (!inputWidth || !inputHeight))) return;

    initHardwareSection();
    selectFirstSensorAvailable();

    document.getElementById('dimensions-content').classList.add('hidden');
    document.getElementById('hardware-content').classList.remove('hidden');

    document.getElementById('hardware-tab').classList.add('passed-tab');

    sessionStorage.setItem('builderStep', 2);
});

document.getElementById('previous-button-dimensions').addEventListener('click', () => 
{
    resetDimensionsSection();

    document.getElementById('dimensions-content').classList.add('hidden');
    document.getElementById('setup-content').classList.remove('hidden');

    document.getElementById('dimensions-tab').classList.remove('passed-tab');

    sessionStorage.setItem('builderStep', 0);
});


/** HARDWARES SECTION */
function resetHardwareSection()
{
    usedSensor = undefined;

    sensorsCompatible.length = 0;
    deleteAllChildren(document.getElementById('hardware-sensors-selection'));

    document.getElementById('hardware-input-radio-indoor').checked = true;
    document.getElementById('hardware-input-radio-outdoor').checked = false;

    document.getElementById('hardware-warning-message').classList.add('hidden');
}

function initHardwareSection()
{
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
 
    bindHardwareEventListeners(sensorsDiv.children);
   
    const switchElement = document.getElementById('hardware-switch-indoor-outdoor');
    const switchInputs = switchElement.querySelectorAll('input');
    for(let i = 0; i < switchInputs.length; i++)
    {
        if(switchInputs[i].checked) switchInputs[i].dispatchEvent(new Event('click'));
    }
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
            else {
                document.getElementById('hardware-warning-message').classList.add('hidden');
                selectFirstSensorAvailable();
            }
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

function selectFirstSensorAvailable()
{
    const sensorsDiv = document.getElementById('hardware-sensors-selection');
    for(let i = 0; i < sensorsDiv.children.length; i++)
    {
        if(!sensorsDiv.children[i].classList.contains('unselectable'))
        {
            if(sceneManager.augmentaSceneLoaded) sensorsDiv.children[i].dispatchEvent(new Event('click'));
            sensorsDiv.children[i].children[0].checked = true;
            break;
        }
    }
}

function selectUsedSensor()
{
    const sceneInfos = sessionStorage.getItem('sceneInfos');
    if(sceneInfos)
    {
        const objects = JSON.parse(sceneInfos).objects;
        let sensorTextId;
        switch(trackingMode)
        {
            case "wall-tracking":
                const usedLidarId = (objects.lidars.length > 0) ? objects.lidars[0].lidarTypeId : 0;
                sensorTextId = lidarsTypes.find(l => l.id === usedLidarId).textId;
                break;
            case "hand-tracking":
            case "human-tracking":
                const usedCameraId = (objects.nodes.length > 0) ? objects.nodes[0].cameraTypeId : 0
                sensorTextId = camerasTypes.find(c => c.id === usedCameraId).textId;
                break;
            default:
                break;
        }

        const sensorsLabels = document.getElementById('hardware-sensors-selection').children;

        for(let i = 0; i < sensorsLabels.length; i++)
        {
            if(!sensorsLabels[i].classList.contains('unselectable') && sensorsLabels[i].querySelector('input').value === sensorTextId)
            {
                if(sceneManager.augmentaSceneLoaded) sensorsLabels[i].dispatchEvent(new Event('click'));
                sensorsLabels[i].querySelector('input').checked = true;
                break;
            }
        }
    }
    else selectFirstSensorAvailable();
}

function getHardware()
{
    const sensorsRadios = document.getElementsByName("sensor-choice");
    for(let i = 0; i < sensorsRadios.length; i++)
    {
        if(sensorsRadios[i].checked) usedSensor = camerasTypes.concat(lidarsTypes).find(sensorType => sensorType.textId === sensorsRadios[i].value);
    }
}

document.getElementById('next-button-hardware').addEventListener('click', () => 
{
    getHardware();
    
    if(!usedSensor) return;

    // fill "My system" section
    initMySystemSection();

    document.getElementById('hardware-content').classList.add('hidden');
    document.getElementById('my-system-content').classList.remove('hidden');

    document.getElementById('my-system-tab').classList.add('passed-tab');

    sessionStorage.setItem('builderStep', 3);
});

document.getElementById('previous-button-hardware').addEventListener('click', () => 
{
    sceneManager.objects.removeSensors();
    resetHardwareSection();

    document.getElementById('hardware-content').classList.add('hidden');
    document.getElementById('dimensions-content').classList.remove('hidden');

    document.getElementById('hardware-tab').classList.remove('passed-tab');

    sessionStorage.setItem('builderStep', 1);
});


/** MY SYTEM SECTION */
function resetMySystemSection()
{
    deleteAllChildren(document.getElementById('my-system-tracking-mode'));
    deleteAllChildren(document.getElementById('my-system-dimensions'));
    deleteAllChildren(document.getElementById('my-system-hardware'));
    deleteAllChildren(document.getElementById('my-system-recap'));
}

function initMySystemSection()
{
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

    let nbSensors;
    const sceneInfos = sessionStorage.getItem('sceneInfos');
    if(sceneInfos)
    {
        const objects = JSON.parse(sceneInfos).objects;
        switch(trackingMode)
        {
            case "wall-tracking":
                nbSensors = objects.lidars.length;
                break;
            case "hand-tracking":
            case "human-tracking":
                nbSensors = objects.nodes.length;
                break;
            default:
                break;
        }
    }
    else
    {
        nbSensors = sceneManager.objects.getNbSensors();
    }

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
}

document.getElementById('previous-button-my-system').addEventListener('click', () => 
{
    resetMySystemSection();
    
    const sensorsDiv = document.getElementById('hardware-sensors-selection');

    document.getElementById('my-system-content').classList.add('hidden');
    document.getElementById('hardware-content').classList.remove('hidden');

    document.getElementById('my-system-tab').classList.remove('passed-tab');

    sessionStorage.setItem('builderStep', 2);
});







/** TO CHECK IF HAS A CLASS (click on tabs passed ?) */
// document.getElementById('setup-tab').classList.contains("passed-tab"))


