/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your system, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your system.
 */

// Import TypeScript modules
import { registerSettings, system } from './settings';
import { preloadTemplates } from './preloadTemplates';
import { UnitSheet } from './UnitSheet';
import * as anchor from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import {Chain} from './chain';

declare global {
  interface LenientGlobalVariableTypes {
    game: never; // the type doesn't matter
  }
}
export let g: Game;
export let conn: anchor.web3.Connection;

// Initialize system
Hooks.once('init', async () => {
  console.log('legacy-fvtt-system | Initializing legacy-fvtt-system');
  g = game;
  // Assign custom classes and constants here

  // Register custom system settings
  await registerSettings();

  // Preload Handlebars templates
  await preloadTemplates();

  // Register custom sheets (if any)
  Actors.registerSheet(system, UnitSheet, {types: ["unit"], makeDefault: true});

  //Anchor Setup
  conn = new anchor.web3.Connection(<string>g.settings.get(system, 'rpc-endpoint'));
});

// Setup system
Hooks.once('setup', async () => {
  // Do anything after initialization but before
  // ready
});

// When ready
Hooks.once('ready', async () => {
  // Do anything once the system is ready
  if(!g.user?.getFlag(system, 'wallet')){
    new Dialog({
      title: "Generate a wallet",
      content: `
      <div>
        <p> You don't have a wallet yet. Please configure a wallet by generating keys by clicking the button below.</p>
        <p> This will create a burner wallet and request an airdrop from the test chain. You can view your address and balance anytime in the settings</p> 
      </div>
      `,
      buttons: {
        "ok": {
          label: "Generate Keys",
          callback: async () => {
            //Generate a wallet
            const wallet = anchor.web3.Keypair.generate();
            game.user?.setFlag(system, 'wallet', bs58.encode(wallet.secretKey));
            //Request airdrop for 5 SOL (1e9 lamports = 1 SOL)
            await conn.requestAirdrop(wallet.publicKey, ((1e9)*10));
          }
        }
      },
      default: "ok"
    }).render(true);
  } 

  //@ts-ignore
  g['anchor'] = anchor;

});

// Add any additional hooks if necessary
