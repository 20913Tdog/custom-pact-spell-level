const MODULE_NAME = 'custom-pact-spell-level';
const spellLevelSetting = "maxLevel";
const affectedCharacters = "affectedCharacters";
const toggleModule = "toggleModule";

Hooks.once('init', () => {
	//This setting allows to set the maximum level of Pact Spells
	game.settings.register(MODULE_NAME, spellLevelSetting, {
    name: 'Max Pact Spell Level',
    hint: 'Change this to set the maximum pact spell level for all warlocks',
    nscope: 'world',
    config: true,
    default: 5,
    type: Number,
	range: {
		min: 0,
		max: 9,
		step: 1
	},
    onChange: preparePactSpellLevelChange,
  });
  game.settings.register(MODULE_NAME, affectedCharacters, {
	//This Setting allows to select characters it applies to, if left empty, no character is affected
    name: 'Affected Characters',
    hint: 'Character Sheet names of the characters that are affected. Seperate with \';\' (e.g. Tree;Dog)',
    scope: 'world',
    config: true,
	default: '',
    type: String,
    onChange: preparePactSpellLevelChange,
  });
  game.settings.register(MODULE_NAME, toggleModule, {
	//This Setting allows to turn off the functionality of the module with deloading the module
    name: 'Activate Max Pact Level Override?',
    hint: 'If this Setting is activated the Pact Spell Level override is in effect',
    scope: 'world',
    config: true,
	default: true,
    type: Boolean,
    onChange: preparePactSpellLevelChange,
  });
});

Hooks.once('ready', () => {
	preparePactSpellLevelChange();
});

Hooks.on('createToken', () => {
	refreshPactSlots();
});

const preparePactSpellLevelChange = () => {	
	let isActive = game.settings.get(MODULE_NAME, toggleModule);
	if (isActive) {
		const basePrepareDerivedData = game.dnd5e.documents.Actor5e.prototype.prepareDerivedData;
		game.dnd5e.documents.Actor5e.prototype.prepareDerivedData = function () {basePrepareDerivedData.call(this);};		
		refreshPactSlots();
	}
}

const refreshPactSlots = () => {
	const start = Date.now();
	console.log('Refreshing Pact Slots for selected Actors');
	game.actors.forEach(refreshActorPactSlots);
	console.log('Done refreshing Pact Slots', `${(Date.now() - start) / 1000}s`);
};

const getAffectedCharacters = () => {
	let affectedCharacters_a = [];
	let affectedCharacters_s = game.settings.get(MODULE_NAME, affectedCharacters);
	if (affectedCharacters_s.length > 0) {
		if (affectedCharacters_s.includes(';')) {
			affectedCharacters_a = affectedCharacters_s.split(';');
		} else {
			affectedCharacters_a = affectedCharacters_s;
		}
	}
	return affectedCharacters_a;
};

const refreshActorPactSlots = (actor) => {	
	if (getAffectedCharacters().includes(actor.name)) {
		const { name, type } = actor;
		if(type !== 'character') {
			console.log(`Not refreshing Pact Slots for non-character Actor`, { name, type });
			return;
		}
		console.log(`Refreshing Pact Slots for Actor`, { name });
		const pactClass = hasSpellcastingClass(actor, (itemData, progression) => {return (progression === 'pact');});
		if (pactClass) {
			console.log(`Actor has at least one pact class`, { name });
			setPactSpellLevel(actor);
		} else {
			console.log(`Actor has no pact classes`, { name });
		}
	}
};

const setPactSpellLevel = (actor) => {
	actor.system.spells.pact.level = game.settings.get(MODULE_NAME, spellLevelSetting);
	console.log(actor.system.spells.pact.level);
}

const hasSpellcastingClass = (actor, fn) => {
	return actor.items.some((item) => {
    if (item.type === 'class') {
		const itemData = item.system;
		let progression = itemData.spellcasting;
		if (typeof progression === 'object') {
			progression = progression.progression;
		}
		if (progression) {
			return fn(itemData, progression);
		}
    }
	});
};