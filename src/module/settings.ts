import { conn, g } from "./legacy-fvtt-system";
import * as anchor from '@project-serum/anchor';
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
export const IDL = ("../assets/contract/legacy_sol.json");
export const system = "legacy-fvtt-system";

export async function registerSettings(): Promise<void> {
  // Register any custom system settings here
  g.settings.register(system, "initalized", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  })

  g.settings.register(system, 'rpc-endpoint', {
    name: "RPC Endpoint",
    config: true,
    scope: "world",
    type: String,
    default: "http://localhost:8899"
  })

  g.settings.register(system, 'idl', {
    name: "IDL Location",
    config: true,
    scope: 'world',
    type: String,
    default: `systems/${system}/assets/contract/legacy_sol.json`
  })

  g.settings.registerMenu(system, "player-wallet-menu", {
    name: "Player Wallet", 
    label: "Info about your wallet",
    type: PlayerMenu,
    restricted: false
  })
}

class PlayerMenu extends FormApplication {
  constructor(object: {}, options={}) {
    super(object, options)
  }

  static get defaultOptions(): FormApplication.Options {
      return mergeObject(super.defaultOptions , {
        id: `${g.user?.name}-Wallet`,
        title: `${g.user?.name}-Wallet`,
        template: `systems/${system}/templates/Wallet.hbs`,
        classes: ["sheet"],
        width: 800,
      })
  }

  //@ts-ignore
  async getData(){
    const _wallet:anchor.web3.Keypair =  anchor.web3.Keypair.fromSecretKey(bs58.decode(<string>game.user?.getFlag(system, 'wallet')));
    const _balance = await conn.getBalance(_wallet.publicKey);

    return {
      wallet: _wallet.publicKey.toString(),
      balance: (_balance/1e9)
    }
  }

  async _updateObject(event: Event, formData?: object): Promise<unknown> {
      return {}
  }
}
