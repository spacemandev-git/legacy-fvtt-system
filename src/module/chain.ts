import { conn, g } from "./legacy-fvtt-system";
import * as anchor from '@project-serum/anchor';
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { system } from "./settings";
import { LegacySol } from "../assets/contract/legacy_sol";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import NodeWallet from './NodeWallet';
import { Buffer } from "buffer";
import { Program } from "@project-serum/anchor";
import * as I from "./interfaces";

Hooks.on('ready', async () => {
  //@ts-ignore
  g['chain'] = Chain;
})

export class Chain {
    static getUserWallet(): anchor.web3.Keypair {
        return anchor.web3.Keypair.fromSecretKey(bs58.decode(<string>game.user?.getFlag(system, 'wallet')))
    }

    /**
     * 
     * @returns Balance in Lamports (1e9 LPS = 1 SOL)
     */
    static async getUserBalance(): Promise<number> {
        return await conn.getBalance(Chain.getUserWallet().publicKey);
    }

    static async getProgram():Promise<Program<LegacySol>>{
        const _wallet = Chain.getUserWallet();
        const LegacySol = await (await fetch(<string>g.settings.get(system, 'idl'))).json();
        //@ts-ignore
        const _provider = new anchor.Provider(conn, new NodeWallet(_wallet), {});
        const program:anchor.Program<LegacySol> = new anchor.Program<LegacySol>(LegacySol, <string>g.settings.get(system, 'contract-address'), _provider);
        return program;
    }

    //LoadMap & Start Listeners
    static async loadGame(name: string){
        const program = await Chain.getProgram();

        // create scene 255x255
        const game_scene = await Scene.create({
            name: name,
            active: true,
            gridType: 1,
            tokenVision: false, 
            globalLight: true,
            height: 12750,
            width: 12750,
            padding: 0,
            grid: 50
        })
        // load all locations
        const [game_adr, game_bmp] = findProgramAddressSync([Buffer.from(name)], program.programId)
        await game.settings.set(system, 'gameacc', game_adr);
        let game_acc = await program.account.game.fetch(game_adr);
        console.log(game_acc.locations);
        const locs: I.Coords[] = <I.Coords[]> game_acc.locations;
        console.log("Locations: ", locs);
        const loc_adrs = locs.map(coord => {
            const [loc_adr, bmp] = findProgramAddressSync([Buffer.from(name),
                new anchor.BN(coord.x).toArrayLike(Buffer, "be", 1),
                new anchor.BN(coord.y).toArrayLike(Buffer, "be", 1)],
                program.programId)
                return loc_adr;
        })
        const loc_accs:I.Location[] = <I.Location[]>await program.account.location.fetchMultiple(loc_adrs);
        let newTiles:any = []
        for(let loc of loc_accs){
            const tileData = {
                img: `systems/${system}/assets/features/${loc.feature?.link}`,
                width: 50,
                height: 50,
                x: (loc.coords.x+127)*50,
                y: (loc.coords.y+127)*50
            }
            newTiles.push(tileData)
        }
        
        console.log("Tiles: ", newTiles);
        //@ts-ignore
        await game_scene?.createEmbeddedDocuments('Tile', newTiles);

        //start hooks
        //program.addEventListener('NewPlayerSpawn', (evt, slot) => {})
        program.addEventListener('NewLocationInitalized', (evt, slot) => {
            if(evt.game_acc == game_adr){
                Hooks.call('location_init', name, evt.coords, evt.feature)    
            }
        })
        //program.addEventListener('TroopsMoved', (evt, slot) => {})
        //program.addEventListener('Combat', (evt, slot) => {})
        // create tiles and units for each location
    }

    static async initPlayer(){
        //init the current player
        const wallet = Chain.getUserWallet();
        const program = await Chain.getProgram();
        const gameacc = <string> g.settings.get(system, 'gameacc');
        const [player_adr, player_bmp] = findProgramAddressSync([wallet.publicKey.toBuffer()], program.programId);
        await program.rpc.initPlayer(game.user?.name, player_bmp, {
            accounts: {
                game: gameacc,
                playerAccount: player_adr,
                player: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId
            }
        });

        //Create player hand
        const folderId = await Folder.create({
            name: <string> game.user?.name,
            type: "Actor"
        })
        await Chain.populatePlayerHand();

        ui.notifications?.info("Player Initalized");
    }

    static async populatePlayerHand(){
        const wallet = Chain.getUserWallet();
        const program = await Chain.getProgram();
        const gameacc = <string> g.settings.get(system, 'gameacc');
        const [player_adr, player_bmp] = findProgramAddressSync([wallet.publicKey.toBuffer()], program.programId);
    
        //wipe the current folder and reset it with cards in player hand
        //@ts-ignore
        const userFolder = game.folders?.getName(<string>game.user?.name).content.map(card => card.delete());

        //create new cards
        //Fetch player hand
        //@ts-ignore
        const player:I.Player = await program.account.player.fetch(player_adr);

        const playerFolderHand = game.folders?.getName(<string>game.user?.name);
        for(let card of player.cards){
            if(card.cardType.unit){
                const unit: I.Troop = <I.Troop> card.cardType.unit;
                await Actor.create({
                    name: `UNIT: ${unit.name}`,
                    type: "unit",
                    img: unit.link,
                    data: {
                        "name": unit.name,
                        "power": unit.power,
                        "class": Object.keys(unit.class)[0],
                        "range": unit.range,
                        "recovery": unit.recovery,
                        "modInf": unit.modInf,
                        "modArmor": unit.modArmor,
                        "modAir": unit.modAir,
                        "link": unit.link,
                        "lastMoved": 0
                    },
                    folder: userFolder
                })
            } else {
                const mod: I.Troop = <I.Troop> card.cardType.umod;
                await Actor.create({
                    name: `MOD: ${mod.name}`,
                    type: "unit",
                    img: mod.link,
                    data: {
                        "name": mod.name,
                        "power": mod.power,
                        "class": Object.keys(mod.class)[0],
                        "range": mod.range,
                        "recovery": mod.recovery,
                        "modInf": mod.modInf,
                        "modArmor": mod.modArmor,
                        "modAir": mod.modAir,
                        "link": mod.link,
                        "lastMoved": 0
                    },
                    folder: userFolder
                })
            }
        } 
    }

    //InitPlayer
    //Move
    //Attack
    //Play Card

    static async requestAirdrop(amt: number){
        await conn.requestAirdrop(Chain.getUserWallet().publicKey, (1e9)*amt);
    }
}

Hooks.on('location_init', (game_name:string, coords:I.Coords, feature:I.Feature) => {
    const tileData = {
        img: `systems/${system}/assets/features/${feature?.link}`,
        width: 50,
        height: 50,
        x: (coords.x+127)*50,
        y: (coords.y+127)*50
    }
    const game_scene = game.scenes?.find(x => x.name == game_name);
    game_scene?.createEmbeddedDocuments("Tile", [tileData]);
})