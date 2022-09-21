import { Engine } from '../designer/js/Engine.js';

new Engine(true);

const tabs = ['setup', 'dimensions', 'hardwares', 'my-system'];

for(let i = 0; i < tabs.length - 1; i++)
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
