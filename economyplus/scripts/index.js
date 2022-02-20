import { Dimension, Player, BeforeChatEvent, world} from "mojang-minecraft";
const version = "1.3.7";
let prefix = "+";
const adminTag = "Admin";
runCommand("scoreboard objectives add database dummy");
runCommand("scoreboard objectives add money dummy");
runCommand("scoreboard objectives add warn dummy");
var db_map = undefined;
let db_player = new Array;
let db_faction = new Array;
let db_warp = new Array;
let db_shop = new Array;

world.events.tick.subscribe(data => {
    try {
        if (db_player.length == 0) {
            db_player = JSON.parse(binaryToText(getBinary(/(?<=\$db_player\()[0-1\s]+(?=\))/g).join("")));
        }
    }
    catch {log("§c§l•> can't load player database. §oFatal Error");}

    //-----------------------------------------

	const players = [...world.getPlayers()]
	if (db_player.length > 0) {
		players.forEach(p => {
            let player = db_player.find((pl) => pl.name == p.name);
			if (player != undefined) {
				let moneys = findTagsStartWith(p.nameTag, "money:");
				if (moneys != undefined) {
					if (moneys.length != 0) {
						try {
							runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
							moneys.forEach(m => {
								if (m.replace("money:", "").match(/^([-0-9]{1,})$/)) {
									db_player[db_player.indexOf(player)].money += parseInt(m.replace("money:", ""));
								}
								else {
									log("§cError money tag : " + m + " for " + p.nameTag);
								}
								runCommand(`tag "${p.nameTag}" remove "${m}"`);
							})
							runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
						}
						catch (e) { log("crash money " + e + "tag : " + moneys[0]) }
					}
				}
				runCommand(`scoreboard players set "${p.nameTag}" "${db_map.scoreMoney}" ${player.money}`);
                runCommand(`scoreboard players set "${p.nameTag}" warn ${player.warn}`);
			}
		})
	}

    //------------------------------------
	if (data.currentTick % 19 == 0) {
		initDB_map();
		prefix = db_map.prefix;
		runCommand("title @a[tag=debug] actionbar " + Math.round(data.currentTick/20) + " db_check : " + (254 - Math.round(data.currentTick/20) % 254));


		for (const p of players) {
			if (p.hasTag("ban")) {
				runCommand(`kick "${p.nameTag}" §c•> You are ban`);
				log("ban!")
			}
			let uuid1 = findTagsStartWith(p.nameTag, "uuid1:");
			let uuid2 = findTagsStartWith(p.nameTag, "uuid2:");
            if (uuid1.length > 0) {
                try {
                    if (db_player.length == 0) {
                        db_player = JSON.parse(binaryToText(getBinary(/(?<=\$db_player\()[0-1\s]+(?=\))/g).join("")));
                    }
                    if (db_player.find((pl) => pl.name == p.name) == undefined) {
                        log("§c•> Error can't find " + p.nameTag + " in the database but was in before... (did you reset the database ?)"+db_player.length);
                        runCommand(`tag "${p.nameTag}" remove ${uuid1}`);
                        runCommand(`tag "${p.nameTag}" remove ${uuid2}`);
                    }
                }
                catch {
                    if (db_map != undefined) {
                        runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
                        runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
                    }
                }
			}
			if (uuid1.length == 0) {
				log(p.name + " added to database");
				uuid1 = uuid(); uuid2 = uuid();
				let playerObj = {
					name:p.name,
					nameTag:p.nameTag,
					money:0,
					uuid1:uuid1,
					uuid2:uuid2,
					homeLimit:db_map.homeLimit,
					warn:0,
					home:[],
					lastMessage:"",
					isMute:false,
					tpa:[],
                    date:new Date().toString()
                };
				runCommand(`tag "${p.nameTag}" add uuid1:${uuid1}`);
				runCommand(`tag "${p.nameTag}" add uuid2:${uuid2}`);
				runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
				db_player.push(playerObj);
				runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
			}
			else {
				for (const ap of db_player) {
					if (p.name != undefined && ap.name == p.name && (ap.uuid1 != uuid1[0].replace("uuid1:", "") || ap.uuid2 != uuid2[0].replace("uuid2:", ""))) {
						try {
							let player = db_player.find((v) => v.uuid1 == ap.uuid1 && v.uuid2 == ap.uuid2);
							log(`${p.nameTag} was ban for using namespoof`);
							//log(`${p.nameTag} was ban for using namespoof (is real name was ${player.nameTag})`); //not wroking ???
						}
						catch (er) {
							log(`${p.nameTag} was ban for using namespoof`);
						}
						runCommand(`tag "${p.nameTag}" add ban`);
						runCommand(`kick "${p.nameTag}"`);
					}
					/*if (db_player.indexOf(ap) == db_player.length) {
						log("§cError can't find " + p.nameTag + " in the database but was in before... (did you reset the database ?)");
						runCommand(`tag "${p.nameTag}" remove ${uuid1}`);
						runCommand(`tag "${p.nameTag}" remove ${uuid2}`);
					}*/
					//--
					if (ap.tpa.length > 0) {
						runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
						ap.tpa.forEach( tp => {
							if (tp.delay == 0) {
								db_player[db_player.indexOf(ap)].tpa.splice(ap.tpa.indexOf(tp),1);
								tellraw(ap.nameTag, `§8•tpa•> ${tp.nameTag} ${tp.type} expired.`);
							}
							else {
								db_player[db_player.indexOf(ap)].tpa[ap.tpa.indexOf(tp)].delay--;
							}
						})
						runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
					}
				}
			}
            //Custom Name
            if (data.currentTick % 76 == 0) {
                let nameTag = p.name;
                if (db_map.customName) {
                    initDB_faction();
                    let colorN = findTagsStartWith(p.nameTag, "colorName:")[0];
                    if (colorN != undefined) {
                        colorN = colorN.replace("colorName:", "");
                    }
                    else {
                        colorN = "§r";
                    }
                    nameTag = colorN + nameTag + "§r";
                    let fac = db_faction.find((f) => f.playerList.find((pl) => pl.nameTag == p.name));
                    if (fac != undefined) {
                        nameTag = `§6-${fac.name}- ${nameTag}`;
                    }
                    runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
                    db_player.find((pl) => pl.name == p.name).nameTag = nameTag;
                    runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
                }
                else {
                    runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
                    db_player.find((pl) => pl.name == p.name).nameTag = p.name;
                    runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
                }
                p.nameTag = nameTag;
            }
            //patch when database crash
            if (data.currentTick % 254 == 0) {
                if (db_player.length != 0) {
                    try {
                        let checkIntegrity = JSON.parse(binaryToText(getBinary(/(?<=\$db_player\()[0-1\s]+(?=\))/g).join("")));
                    }
                    catch (er)
                    {
                        log("§cFatal Error, database cashed, trying to rebuild it...")
                        runCommand("scoreboard objectives remove database")
                        runCommand("scoreboard objectives add database dummy")
                        runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
                        runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
                        runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
                        runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
                        log("§cDatabase Restored with success.\n§8(please send a message to mister art43 on discord with the last command you used before this error happen).")
                    }
                }
            }
        }
	}
})

world.events.beforeChat.subscribe(data => {
	try {
		try {  
			if (data.message.substr(0, prefix.length) == prefix) {
				let mydata = data;
				if (mydata.sender.nameTag == undefined) {
					mydata.sender.nameTag = mydata.sender.name;
				}
				commands(mydata.message.substr(prefix.length).replace(/@"/g,"\""), data);
				data.cancel = true;
			}
			else {
				customChat(data);
				data.cancel = true;
			}
		}
		catch {
			if (data.message.substr(0, prefix.length) == prefix) {
				commands(data.message.substr(prefix.length).replace(/@"/g,"\""), data);
				data.cancel = true;
			}
			else {
				customChat(data);
				data.cancel = true;
			}
		}
	} catch (e) {
		console.warn(`beforeChat: ${e}\n${e.stack}`)
	}
})

function customChat(data) {
	let name = data.sender.name;
	let facName = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name))
	if (name == undefined) {
		tellraw("@a", data.message);
		return;
	}
	let player = db_player.find((p) => p.name == data.sender.name);
	if (player != undefined) {
		if (player.lastMessage == data.message.trim()) {
			tellraw(data.sender.nameTag, "§cDon't spam !")
			return;
		}
		else {
			runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
			db_player.find((p) => p.name == data.sender.name).lastMessage = data.message.trim();
			runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
		}
	}
	if (!player.isMute) {
		let ranks = findTagsStartWith(data.sender.nameTag, "role:");
		let colorN = findTagsStartWith(data.sender.nameTag, "colorName:")[0];
		if (colorN != undefined) {
			colorN = colorN.replace("colorName:", "");
		}
		let colorM = findTagsStartWith(data.sender.nameTag, "colorMessage:")[0];
		if (colorM != undefined) {
			colorM = colorM.replace("colorMessage:", "");
		}
		let message = "";
		if (facName != undefined) {
			message += "§6•" + facName.name + "•§r "
		}
		ranks.forEach(rk => {
			message += `[${rk.replace("role:", "")}§r] `;
		});
		if (colorN != undefined) {
			message += colorN;
		}

		message += name + " §r•> ";
		if (colorM != undefined) {
			message += colorM;
		}
		message += data.message.replace(/§[1-9a-gk-o]/g, "").replace(/\\/g, "\\\\");
		tellraw("@a", message);
	}
}
/**
 * 
 * @param {*} command 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function commands(command, data) {
	const args = command.match(/[\""].+?[\""]|[^ ]+/g);
	let msg = "";
	for (const arg of args){
		msg += arg + "|";
	}
	tellraw("@a[tag=debug]","§a" + msg + data.sender.name);

	//db_map
	if ((args[0] == "sethomelimit" || args[0] == "sethl") && data.sender.hasTag(adminTag)) {
		sethomelimit(args,data);
	}
	if ((args[0] == "setmemberlimit" || args[0] == "setml") && data.sender.hasTag(adminTag)) {
		setmemberlimit(args,data);
	}
	if ((args[0] == "setscoremoney" || args[0] == "setscmoney" || args[0] == "setscm") && data.sender.hasTag(adminTag)) {
		setscoremoney(args, data);
	}
	if ((args[0] == "setprefix" || args[0] == "setpf") && data.sender.hasTag(adminTag)) {
		setprefix(args, data);
	}
	if ((args[0] == "setcustomname" || args[0] == "setcn") && data.sender.hasTag(adminTag)) {
		setcustomname(args, data);
	}

	//db_player[].home
	if (args[0] == "home" || args[0] == "h") {
		home(args, data); return;
	}
	if (args[0] == "sethome" || args[0] == "sh") {
		sethome(args,data); return;
	}
	if (args[0] == "delhome" || args[0] == "dh") {
		delhome(args,data); return;
	}
	if (args[0] == "listhome" || args[0] == "homelist" || args[0] == "lh") {
		listhome(args, data); return;
	}
	
	//debug
	if (args[0] == "db" && data.sender.hasTag(adminTag)) {
        db_player = JSON.parse(binaryToText(getBinary(/(?<=\$db_player\()[0-1\s]+(?=\))/g).join("")));
		initDB_faction();initDB_warp();
		log(JSON.stringify(db_map) + "\n\n");
		log(JSON.stringify(db_player) + "\n\n");
		log(JSON.stringify(db_faction) + "\n\n");
		log(JSON.stringify(db_warp)); return;
	}
	/*if (args[0] == "uuid"){
		tellraw("@a", uuid()); return;
	}*/

	//db_faction
	if (args[0] == "faction" || args[0] == "f") {
		if (args[1] == "create" || args[1] == "c") {
			Fcreate(args, data); return;
		}
		else if (args[1] == "quit" || args[1] == "q") {
			Fquit(args, data); return;
		}
		else if (args[1] == "invit" || args[1] == "invite" || args[1] == "inv") {
			Finvit(args, data); return;
		}
		else if (args[1] == "join" || args[1] == "j") {
			Fjoin(args, data); return;
		}
		else if (args[1] == "info" || args[1] == "i") {
			Finfo(args, data); return;
		}
		else if (args[1] == "promote" || args[1] == "rank") {
			Fpromote(args, data); return;
		}
		else if (args[1] == "demote" || args[1] == "unrank") {
			Fdemote(args, data); return;
		}
		else if (args[1] == "home" || args[1] == "h") {
			Fhome(args, data); return;
		}
		else if (args[1] == "sethome") {
			Fsethome(args, data); return;
		}
		else if (args[1] == "kick" || args[1] == "k") {
			Fkick(args, data); return;
		}
		else if (args[1] == "bank" || args[1] == "balance" || args[1] == "b") {
			Fbank(args, data); return;
		}
		else if (args[1] == "ally") {
			Fally(args, data); return;
		}
		else if (args[1] == "enemy") {
			Fenemy(args, data); return;
		}
		else if (args[1] == "close" || args[1] == "open") {
			Fopen(args, data); return;
		}
		else if (args[1] == "list" || args[1] == "l") {
			Flist(args, data); return;
		}
	}

	//db_warp
	if (args[0] == "warp" || args[0] == "w") {
		if (args[1] == "add" && data.sender.hasTag(adminTag)) {
			Wadd(args, data); return;
		}
		else if (args[1] == "remove" && data.sender.hasTag(adminTag)) {
			Wremove(args, data); return;
		}
		else if (args[1] == "access" && data.sender.hasTag(adminTag)) {
			Waccess(args, data); return;
		}
		else if (args[1] == "list" || args[1] == "l") {
			Wlist(args, data); return;
		}
		else if ((args[1] == "close" || args[1] == "open") && data.sender.hasTag(adminTag)) {
			Wclose(args, data); return;
		}
		else if ((args[1] == "message" || args[1] == "msg") && data.sender.hasTag(adminTag)) {
			Wmessage(args, data); return;
		}
		else {
			Wwarp(args, data); return;
		}
	}

	//player command
	if (args[0] == "spawn") {
		pay(args, data); return;
	}
	if (args[0] == "pay") {
		pay(args, data); return;
	}
	if (args[0] == "balance" || args[0] == "bank") {
		balance(args, data); return;
	}
	if (args[0] == "help") {
		tellraw(data.sender.nameTag, help(args, data));
	}
	if (args[0] == "sell") {}
	if (args[0] == "tpa") {
		Ptpa(args, data); return;
	}
	if (args[0] == "tpahere" || args[0] == "tpah") {
        Ptpahere(args, data); return;
    }
	if (args[0] == "tpayes" || args[0] == "tpaccept") {
        Ptpayes(args, data); return;
    }


	//admin command
	if (data.sender.hasTag(adminTag)) {
		if (args[0] == "shop") { }
		if (args[0] == "inventory") {
            Ainventory(args, data); return;
        }
		if (args[0] == "warn") {
            Awarn(args,data)
        }
        if (args[0] == "unwarn") {
            Aunwarn(args,data)
        }
		if (args[0] == "mute") { }
		if (args[0] == "muteT") { }
		if (args[0] == "role") {
			Arole(args, data); return;
		}
        //debug for mister
        if (args[0] == "manage" && data.sender.hasTag("debug")) {
            if (args[1] == "remove") {
                let player = db_player.find((p) => p.name == args[2].replace(/["@]/g,""));
                if (player == undefined) { player = db_player.find((p) => p.nameTag == args[2]);}
                if (player != undefined) {
                    runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
                    db_player.splice(db_player.indexOf(player),1);
                    runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
                }
            }
            if (args[1] == "info") {
                let player = db_player.find((p) => p.name == args[2].replace(/["@]/g,""));
                if (player == undefined) { player = db_player.find((p) => p.nameTag == args[2]);}
                if (player != undefined) {
                    log(JSON.stringify(player,null,4));
                }
            }
            return;
        }
	}
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Ainventory(args, data) {
    if (args.length >= 2) {
        let name = "";
        for (let i = 1; i < args.length; i++) {
            name += args[i].replace(/[@"]/g, "") + " ";
        }
        name = name.trim();
        const players = [...world.getPlayers()]
        let player = players.find((p) => p.name == name)
        if (player != undefined) {
            let container = player.getComponent("minecraft:inventory").container
            let o = []
            for (let i = 0; i < 36; i++) {
                o.push(container.getItem(i) ?? { id: "§ominecraft:air", amount: 0, data: 0 })
            }
            let message = `§l§e${player.name}'s HotBar :`;
            o.forEach(i => {
                if (o.indexOf(i) == 9) {
                    message += "\n§e§lInventory :"
                }
                message += `\n§r§aSlot ${o.indexOf(i) + 1}:§b ${i.id}§c x${i.amount}§r`
            })
            tellraw(data.sender.nameTag, message);
        }
    }
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Aunwarn(args, data) {
    let name = "";
    for (let i = 1; i < args.length; i++) {
        name += args[i].replace(/[@"]/g, "") + " ";
    }
    name = name.trim();
	let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
	if (player != undefined) {
		if (player.warn > 0) {
			db_player[db_player.indexOf(player)].warn--;
			tellraw(data.sender.nameTag, "§e•> " + player.name + " un-warn (now at " + db_player[db_player.indexOf(player)].warn + ")");
		}
		else {
			tellraw(data.sender.nameTag, "§cPlayer has 0 warn.");
		}
    }
    else {
        tellraw(data.sender.nameTag, "§cPlayer not found.");
    }
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Awarn(args, data) {
    let name = "";
    for (let i = 1; i < args.length; i++) {
        name += args[i].replace(/[@"]/g, "") + " ";
    }
    name = name.trim();
    let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
    if (player != undefined) {
        db_player[db_player.indexOf(player)].warn++;
        tellraw(data.sender.nameTag, "§e"+player.name+" warn (now at "+db_player[db_player.indexOf(player)].warn+")");
        tellraw(player.nameTag, "§c•> You receive a warn !");
    }
    else {
        tellraw(data.sender.nameTag, "§cPlayer not found.");
    }
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Ptpayes(args, data) {
    if (args.length == 1) {
        let player = db_player.find((p) => p.name == data.sender.name);
        if (player != undefined) {
            if (player.tpa.length != 0) {
                runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
                player.tpa.forEach(tp => {
                    let other = db_player.find((p) => p.name == tp.nameTag);
                    if (other != undefined) {
                        if (tp.type == "tpa") {
                            runCommand(`tp "${other.nameTag}" "${player.nameTag}"`);
                            db_player[db_player.indexOf(player)].tpa.splice(player.tpa.indexOf(tp), 1);
                        }
                        else if (tp.type == "tpahere") {
                            runCommand(`tp "${player.nameTag}" "${other.nameTag}"`);
                            db_player[db_player.indexOf(player)].tpa.splice(player.tpa.indexOf(tp), 1);
                        }
                        else {
                            log("§cError tpa");
                        }
                    }
                })
                runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
            }
            else {
                tellraw(data.sender.nameTag, "§cYou don't have tpa request.");
            }
        }
        else {
            tellraw(data.sender.nameTag, "§cPlayer not found.");
        }
    }
    else {
        tellraw(data.sender.nameTag, "§cWrong Arguments");
    }
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Ptpahere(args, data) {
	if (args.length >= 2) {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i].replace(/["@]/g, "") + " ";
		}
		name = name.trim();
		let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
		if (player != undefined) {
			if (player.tpa.find((tp) => tp.nameTag == data.sender.name) == undefined) {
				runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
				db_player[db_player.indexOf(player)].tpa.push({nameTag:data.sender.name, type:"tpahere", delay:60});
				runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> Tpa request send to " + player.name);
				tellraw(player.nameTag, "§e•> "+data.sender.name+"§r§e send you a tpa request §7(do " + prefix + "tpayes to accept).")
			}
			else {
				tellraw(data.sender.nameTag, "§cYou already send a tpa request to this player, please wait.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cNo player found");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Ptpa(args, data) {
	if (args.length >= 2) {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i].replace(/["@]/g, "") + " ";
		}
		name = name.trim();
		let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
		if (player != undefined) {
			if (player.tpa.find((tp) => tp.nameTag == data.sender.name) == undefined) {
				runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
				db_player[db_player.indexOf(player)].tpa.push({nameTag:data.sender.name, type:"tpa", delay:60});
				runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> Tpa request send to " + player.name);
				tellraw(player.nameTag, "§e•> "+data.sender.name+"§r§e send you a tpa request §7(do " + prefix + "tpayes to accept).")
			}
			else {
				tellraw(data.sender.nameTag, "§cYou already send a tpa request to this player, please wait.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cNo player found");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function setcustomname(args, data) {
	if (args.length == 1) {
		if (db_map.customName) {
			runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
			db_map.customName = false;
			runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			tellraw(data.sender.nameTag, "§eCustom Name §cOFF§e.");
		}
		else {
			runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
			db_map.customName = true;
			runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			tellraw(data.sender.nameTag, "§eCustom Name §aON§e.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

/**
 * +shop add <sell|buy> <itemPrice> <itemLimit> <shopName>
 * +shop remove <sell|buy> <shopName>
 * +shop add <sell|buy> <runCommand> <shopName>
 * +shop add sell 25 *
 * +shop add buy 25 100
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function shop(args, data) {
	if (args.length) {
		
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Fenemy(args, data) {
	if (args.length > 3) {
		if (args[2] == "add") {
			let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader"));
			if (fac != undefined) {
				let name = "";
				for (let i = 3; i < args.length; i++) {
					name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
				}
				name = name.trim();
				if (fac.enemy.find((a) => a.name == name) == undefined && fac.ally.find((a) => a.name == name) == undefined) {
					let enemy = db_faction.find((f) => f.name == name);
					if (enemy != undefined) {
						runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
						db_faction[db_faction.indexOf(fac)].enemy.push({ name: name });
						runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
						tellraw(data.sender.nameTag, `§e•> "${name}" added has enemy`);
					}
					else {
						tellraw(data.sender.nameTag, "§cNo faction found.");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cYou already set relation with this faction.");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cOnly the leader can edit relation.");
			}
		}
		else if (args[2] == "remove") {
			let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader"));
			if (fac != undefined) {
				let name = "";
				for (let i = 3; i < args.length; i++) {
					name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
				}
				name = name.trim();
				let enemy = fac.enemy.find((a) => a.name == name);
				if (enemy != undefined) {
					if (enemy != undefined) {
						runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
						db_faction[db_faction.indexOf(fac)].enemy.splice(fac.enemy.indexOf(enemy),1);
						runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
						tellraw(data.sender.nameTag, `§e•> "${name}" removed has enemy`);
					}
					else {
						tellraw(data.sender.nameTag, "§cNo faction found.");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cYou didn't set relation with this faction.");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cOnly the leader can edit relation.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cInvalid Arguments (should be add | remove)");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

/**
 * 
 * @param {string[]} args
 * @param {BeforeChatEvent} data
 * @returns
*/
function Fally(args, data) {
	if (args.length > 3) {
		if (args[2] == "add") {
			let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader"));
			if (fac != undefined) {
				let name = "";
				for (let i = 3; i < args.length; i++) {
					name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
				}
				name = name.trim();
				if (fac.ally.find((a) => a.name == name) == undefined && fac.enemy.find((a) => a.name == name) == undefined) {
					let ally = db_faction.find((f) => f.name == name);
					if (ally != undefined) {
						runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
						db_faction[db_faction.indexOf(fac)].ally.push({ name: name });
						runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
						tellraw(data.sender.nameTag, `§e•> "${name}" added has ally`);
					}
					else {
						tellraw(data.sender.nameTag, "§cNo faction found.");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cYou already set relation with this faction.");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cOnly the leader can edit relation.");
			}
		}
		else if (args[2] == "remove") {
			let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader"));
			if (fac != undefined) {
				let name = "";
				for (let i = 3; i < args.length; i++) {
					name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
				}
				name = name.trim();
				let ally = fac.ally.find((a) => a.name == name);
				if (ally != undefined) {
					if (ally != undefined) {
						runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
						db_faction[db_faction.indexOf(fac)].ally.splice(fac.ally.indexOf(ally),1);
						runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
						tellraw(data.sender.nameTag, `§e•> "${name}" removed has ally`);
					}
					else {
						tellraw(data.sender.nameTag, "§cNo faction found.");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cYou didn't set relation with this faction.");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cOnly the leader can edit relation.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cInvalid Arguments (should be add | remove)");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function Fopen(args, data) {
	initDB_faction();
	if (args.length == 2) {
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader"));
		if (fac != undefined) {
			if (fac.isOpen == true) {
				runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
				db_faction[db_faction.indexOf(fac)].isOpen = false;
				runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> Faction is now on invite only.");
			}
			else if (fac.isOpen == false) {
				runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
				db_faction[db_faction.indexOf(fac)].isOpen = true;
				runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> Faction is now open to everyone who want to join.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cNo faction found.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function Fdemote(args, data) {
	if (args.length >= 3) {
		initDB_faction();
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
		if (fac != undefined) {
			let name = "";
			for (let i = 2; i < args.length; i++) {
				name += args[i].replace(/["]/g, "").replace(/@/g, "") + " ";
			}
			name = name.trim();
			let player = fac.playerList.find((p) => p.nameTag.toLowerCase() == name.toLowerCase());
			let promoter = fac.playerList.find((p) => p.nameTag == data.sender.name);
			if (player != undefined) {
				if (player.permission == "co leader" && promoter.permission == "leader") {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					db_faction[db_faction.indexOf(fac)].playerList[fac.playerList.indexOf(player)].permission = "member";
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					tellraw(data.sender.nameTag, "§e•> You have demoted "+player.nameTag+" to '§amember§e'");
					tellraw(db_player.find((p) => p.name == player.nameTag).nameTag, `§e•> you have been demoted to member`);
				}
				else if (player.permission == "member" && promoter.permission == "leader") {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					db_faction[db_faction.indexOf(fac)].playerList[fac.playerList.indexOf(player)].permission = "visitor";
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					tellraw(data.sender.nameTag, `§e•> ${player.nameTag} has been demoted to visitor`);
					tellraw(db_player.find((p) => p.name == player.nameTag).nameTag, `§e•> you have been demoted to visitor`);
				}
				else if (player.permission == "visitor") {
					tellraw(data.sender.nameTag, `§cYou can't demote a visitor`);
				}
				else {
					tellraw(data.sender.nameTag, "§cYou can't do that");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cNo player found");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cYou can't do that");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function Fpromote(args, data) {
	if (args.length >= 3) {
		initDB_faction();
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
		if (fac != undefined) {
			let name = "";
			for (let i = 2; i < args.length; i++) {
				name += args[i].replace(/["]/g, "").replace(/@/g, "") + " ";
			}
			name = name.trim();
			let player = fac.playerList.find((p) => p.nameTag.toLowerCase() == name.toLowerCase());
			let promoter = fac.playerList.find((p) => p.nameTag == data.sender.name);
			if (player != undefined) {
				if (player.permission == "co leader" && promoter.permission == "leader") {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					let i = db_faction.indexOf(fac);
					db_faction[i].owner = player.nameTag;
					db_faction[i].playerList[fac.playerList.indexOf(player)].permission = "leader";
					db_faction[i].playerList[fac.playerList.indexOf(promoter)].permission = "co leader";
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					fac.playerList.forEach((p) => {
						tellraw(db_player.find((pl) => pl.name == p.nameTag).nameTag, `§e•> ${player.nameTag} is the new leader !`);
					})
					tellraw(data.sender.nameTag, "§e•> You have been demote to '§aco leader§e'");
				}
				else if (player.permission == "member" && promoter.permission == "leader") {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					db_faction[db_faction.indexOf(fac)].playerList[fac.playerList.indexOf(player)].permission = "co leader";
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					tellraw(data.sender.nameTag, `§e•> ${player.nameTag} has been pomoted to co leader`);
					tellraw(db_player.find((p) => p.name == player.nameTag).nameTag, `§e•> you have been pomoted to co leader`);
				}
				else if (player.permission == "visitor") {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					db_faction[db_faction.indexOf(fac)].playerList[fac.playerList.indexOf(player)].permission = "member";
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					tellraw(data.sender.nameTag, `§e•> ${player.nameTag} has been pomoted to member`);
					tellraw(db_player.find((p) => p.name == player.nameTag).nameTag, `§e•> you have been pomoted to member`);
				}
				else {
					tellraw(data.sender.nameTag, "§cYou can't do that");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cNo player found");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cYou can't do that");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function setprefix(args, data) {
	if (args.length == 2) {
		if (!args[1].startsWith("/")) {
			if (!args[1].match(/[ "]/g)) {
				runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
				db_map.prefix = args[1];
				runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> global prefix has been changed to §a"+args[1])+"§e."
			}
			else {
				tellraw(data.sender.nameTag, "§cInvalid prefix.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cDo not use a prefix starting with '/'");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function Flist(args, data) {
	initDB_faction();
	if (args.length == 2) {
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name));
		if (fac != undefined) {
			let message = "§eList of "+fac.playerList.length+" player(s) :"
			fac.playerList.forEach( p => {
				message += `\n  §e-§a${p.nameTag}§e |role> ${p.permission}`;
			});
			tellraw(data.sender.nameTag, message);
		}
		else {
			tellraw(data.sender.nameTag, "§cNo faction found.")
		}
	}
	else {
		let name = "";
		for (let i = 2; i < args.length; i++) {
			name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
		}
		name = name.trim();
		let playerList = db_faction.find((f) => f.name == name).playerList;
		if (playerList != undefined) {
			let message = "§eList of "+playerList.length+" player(s) :"
			playerList.forEach( p => {
				message += `\n  §e-§a${p.nameTag} §e|role> ${p.permission}`;
			});
			tellraw(data.sender.nameTag, message);
		}
		else {
			tellraw(data.sender.nameTag, "§cNo faction found.")
		}
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function Arole(args, data) {
	if (args.length >= 4) {
		if (args[1] == "add") {
			let name = "";
			for (let i = 3; i < args.length; i++) {
				name += args[i].replace(/"/g, "") + " ";
			}
			name = name.trim();
			let player = db_player.find((p) => p.name.toLowerCase() == args[2].replace(/"/g, "").replace(/@/g, "").toLowerCase());
			if (player != undefined) {
                if (!hasTag(player.nameTag, "role:"+name)) {
                    runCommand(`tag "${player.nameTag}" add role:${name}`);
				    tellraw(data.sender.nameTag, "§e•> Role §a" + name + " §r§eadded to " + args[2].replace(/"/g, "") + ".");
                }
                else {
                    tellraw(data.sender.nameTag, "§cThe player already have this role.");
                }
			}
			else {
				tellraw(data.sender.nameTag, "§cNo player found.");
			}
		}
		else if (args[1] == "remove") {
			let name = "";
			for (let i = 3; i < args.length; i++) {
				name += args[i].replace(/"/g, "") + " ";
			}
			name = name.trim();
			let player = db_player.find((p) => p.name.toLowerCase() == args[2].replace(/"/g, "").replace(/@/g, "").toLowerCase());
			if (player != undefined) {
				if (hasTag(player.nameTag, "role:"+name)) {
					runCommand(`tag "${player.nameTag}" remove role:${name}`);
					tellraw(data.sender.nameTag, "§e•> Role §a" + name + " §r§eremoved to " + args[2].replace(/"/g, "") + ".");
				}
				else {
					tellraw(data.sender.nameTag, "§cThe player don't have this role.");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cNo player found.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cWrong Arguments (should be add | remove).");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
*/
function balance(args, data) {
	if (args.length == 1) {
		tellraw(data.sender.nameTag, "§e"+db_player.find((p) => p.name == data.sender.name).money);
	}
	else {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i].replace(/"/g, "").replace(/@/g, "") + " ";
		}
		name = name.trim();
		let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
		if (player != undefined) {
			tellraw(data.sender.nameTag, "§e•> "+player.name+" : "+player.money);
		}
		else {
			tellraw(data.sender.nameTag, "§cPlayer not found.");
		}
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function pay(args, data) {
	if (args[args.length - 1].match(/[0-9]/g)) {
		let name = "";
		for (let i = 1; i < args.length - 1; i++) {
			name += args[i].replace(/"/g, "").replace(/@/g, "") + " ";
		}
		name = name.trim();
		let money = parseInt(args[args.length - 1])
		if (money > 0) {
			let sender = db_player.find((p) => p.name == data.sender.name);
			if (sender != undefined) {
				let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
				if (player != undefined) {
					if (sender.money >= money) {
						runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
						db_player[db_player.indexOf(sender)].money -= money;
						db_player[db_player.indexOf(player)].money += money;
						runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
						tellraw(data.sender.nameTag, "§e•> Send §a" + money + "§e to " + player.nameTag + ".");
						tellraw(player.nameTag, "§e•> Receive §a" + money + "§e from " + sender.nameTag + ".");
					}
					else {
						tellraw(data.sender.nameTag, "§cNo enough money.");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cPlayer not found.");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cError...");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cInvalid value.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function help(args, data) {
	if (args.length == 1 && data.sender.hasTag(adminTag)) {
		return "§e§lMade by and for Economyplus §ev" + version + " :\n§aAdmin command§e\n>- sethomelimit\n>- setmemberlimit\n>- setscoremoney\n>- setprefix\n>- role\n\n§aCommon Command§e\n>- home\n>- sethome\n>- delhome\n>- listhome\n>- faction\n>- warp\n>- pay\n>- balance\n\n§7if you want to know more about a command do "+prefix+"help <CommandName>";
	}
	if (args.length == 1) {
		return "§e§lMade by and for Economyplus §ev" + version + " :\nRead documentation.economyplus.dev for more help with custom commands\n>- home\n>- sethome\n>- delhome\n>- listhome\n>- faction\n>- warp\n>- pay\n>- balance\n\n§7if you want to know more about a command do "+prefix+"help <CommandName>";
	}
	else if (args.length == 2) {
		if (args[1] == "home" || args[1] == "h") {
			let Alias = "§e§lAlias : h, home";
			let command = `\n  §r§ecommand : "${prefix}home <homeName>"`;
			let example = `\n  example : "${prefix}h base"`;
			let explain = "\n  §6teleport the player to his home."; 
			return Alias + command + example + explain;
		}
		if (args[1] == "spawn" || args[1] == "s") {
			let Alias = "§e§lAlias : s, spawn";
			let command = `spawn`;
			return Alias + command + example + explain;
		}
		if (args[1] == "sethome" || args[1] == "sh") {
			let Alias = "§e§lAlias : sh, sethome";
			let command = `\n  §r§ecommand : "${prefix}sethome <homeName>"`;
			let example = `\n  example : "${prefix}sh base"`;
			let explain = "\n  §6add a new home.";
			return Alias + command + example + explain;
		}
		if (args[1] == "listhome" || args[1] == "homelist" || args[1] == "lh") {
			if (data.sender.hasTag(adminTag)) {
				let Alias = "§e§lAlias : lh, listhome, homelist";
				let command = `\n  §r§ecommand : "${prefix}listhome"\n  §r§aAdmin §ecommand : "${prefix}listhome <playerName>"`;
				let example = `\n  example : "${prefix}listhome"`;
				let explain = "\n  §6show all home a player have.";
				return Alias + command + example + explain;
			}
			else {
				let Alias = "§e§lAlias : lh, listhome, homelist";
				let command = `\n  §r§ecommand : "${prefix}listhome"`;
				let example = `\n  example : "${prefix}listhome"`;
				let explain = "\n  §6show all home you have.";
				return Alias + command + example + explain;
			}
		}
		if (args[1] == "delhome" || args[1] == "dh") {
			if (data.sender.hasTag(adminTag)) {
				let Alias = "§e§lAlias : dh, delhome";
				let command = `\n  §r§ecommand : "${prefix}delhome base"\n  §r§aAdmin §ecommand : "${prefix}delhome "<playerName>" "<HomeName>""`;
				let example = `\n  example : "${prefix}listhome"`;
				let explain = "\n  §6delete the home of a player (/!\\ : <playerName> and <HomeName> need to be between quote)";
				return Alias + command + example + explain;
			}
			else {
				let Alias = "§e§lAlais : dh, delhome";
				let command = `\n  §r§ecommand : "${prefix}delhome <homeName>"`;
				let example = `\n  example : "${prefix}delhome base"`;
				let explain = "\n  §6delete a home you have.";
				return Alias + command + example + explain;
			}
		}
	}
	if (args[1] == "warp" || args[1] == "w") {
		if (args.length == 2) {
			let Alias = "§e§lAlias : w, warp";
			let command = `\n  §r§ecommand : "${prefix}warp <warpName>"`;
			let example = `\n  example : "${prefix}warp spawn"`;
			let explain = "\n  §6teleport you to a warp.";
			let other = `\n  §eOther command : "warp list".`;
			if (data.sender.hasTag(adminTag)) {
				other += `\n  §eOther Admin command : "warp add", "warp remove", "warp access", "warp message", "warp close".`;
			}
			return Alias + command + example + explain + other;
		}
		else if (args[2] == "list" || args[2] == "l") {
			let Alias = "§e§lAlias : l, list";
			let command = `\n  §r§ecommand : "${prefix}warp list"`;
			let example = `\n  example : "${prefix}warp l"`;
			let explain = "\n  §6show all warp you have access.";
			return Alias + command + example + explain;
		}
		else if (data.sender.hasTag(adminTag)) {

		}
	}
    if (args[1] == "faction" || args[1] == "f") {
        if (args.length == 2) {
            let Alias = "§e§lAlias : f, faction";
			let command = `\n  §r§ecommand : \n  "${prefix}faction create <FactionName>"\n  "${prefix}faction invite <PlayerName>"\n  "${prefix}faction kick <PlayerName>"\n  "${prefix}faction join <FactionName>"\n  "${prefix}faction info <FactionName>"\n  "${prefix}faction info\n  "${prefix}faction open"\n  "${prefix}faction promote <PlayerName>"\n  "${prefix}faction demote <PlayerName>\n  "${prefix}faction bank <add|remove> <number>"\n  "${prefix}faction <ally|enemy> <add|remove> <FactionName>"`;
			let example = ``;
			let explain = "\n  §6All faction command.";
            return Alias + command + example + explain;
        }
    }
	return "§cUnknow Command";
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function setscoremoney(args, data) {
	initDB_map();
	if (args.length >= 2) {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i].replace(/"/g, "") + " ";
		}
		name = name.trim();
		if (name != "") {
			runCommand(`scoreboard objectives add "${name}" dummy `);
			runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
			db_map.scoreMoney = name;
			runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			tellraw(data.sender.nameTag, "§e•> New score define : " + name);
		}
		else {
			tellraw(data.sender.nameTag, "§cWrong Name.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Argument.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fbank(args, data) {
	initDB_faction();
	if (args.length == 2) {
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name));
		if (fac != undefined) {
			tellraw(data.sender.nameTag, "§e•> Faction Bank : " + fac.bank);
		}
	}
	else if (args.length == 4) {
		if (args[3].match(/[0-9]/g)) {
			let money = parseInt(args[3]);
			if (money > 0) {
				if (args[2] == "add") {
					let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name));
					if (fac != undefined) {
						if (db_player.find((p) => p.name == data.sender.name).money >= money) {
							runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
							runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
							db_player.find((p) => p.name == data.sender.name).money -= money;
							db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name)).bank += money;
							runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
							runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
							tellraw(data.sender.nameTag, "§e•> " + money + " transfered to your faction.");
						}
						else {
							tellraw(data.sender.nameTag, "§cNo enough money.");
						}
					}
					else {
						tellraw(data.sender.nameTag, "§cYou need to be in a faction.");
					}
				}
				else if (args[2] == "remove") {
					let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
					if (fac != undefined) {
						if (fac.bank >= money) {
							runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
							runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
							db_player.find((p) => p.name == data.sender.name).money += money;
							db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name)).bank -= money;
							runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
							runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
							tellraw(data.sender.nameTag, "§e•> " + money + " transfered to your faction");
						}
						else {
							tellraw(data.sender.nameTag, "§cNo enough money in the bank");
						}
					}
					else {
						tellraw(data.sender.nameTag, "§cYou Can't do that");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cWrong Argument (should be add | remove)");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cInvalid value");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cPlease enter a valid number");
		}
	}
    else {
		tellraw(data.sender.nameTag, "§cWrong Argument.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fkick(args, data) {
	if (args.length >= 3) {
		let name = "";
		for (let i = 2; i < args.length; i++) {
			name += args[i].replace(/"/g, "").replace(/@/g, "") + " ";
		}
		name = name.trim();
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
		if (fac != undefined) {
			let player = fac.playerList.find((p) => p.nameTag.toLowerCase() == name.toLowerCase() && p.permission != "leader");
			if (player != undefined) {
				runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
				db_faction[db_faction.indexOf(fac)].playerList.splice(fac.playerList.indexOf(player),1);
				runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> You kick "+name+".");
				tellraw(db_player.find((p) => p.name == player.nameTag).nameTag, "§e•> You have been kick from the " + fac.name + " faction.");
			}
			else {
				tellraw(data.sender.nameTag, "§cYou can't kick this player.")
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cYou can't use this command.")
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Argument.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fsethome(args, data) {
	initDB_faction();
	let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader"));
	if (fac != undefined) {
		if (fac.isFhome) {
			if (getCurrentDimension(data.sender) == "overworld") {
				runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
				db_faction.splice(db_faction.indexOf(fac),1);
				fac.x = Math.ceil(data.sender.location.x + 0.0001) - 1;
				fac.y = Math.ceil(data.sender.location.y - 0.4999);
				fac.z = Math.ceil(data.sender.location.z + 0.0001) - 1;
				db_faction.push(fac);
				runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
				tellraw(data.sender.nameTag, `§e•> f home set : §a${fac.x} ${fac.y} ${fac.z}`);
			}
			else {
				tellraw(data.sender.nameTag, "§cYou can only place f home in overworld.")
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cf home are disable.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cYou can't do that.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function setmemberlimit(args, data) {
	if (args[args.length - 1].match(/^([0-9]{1,})$/)) {
		let nb = parseInt(args[args.length - 1]);
		if (args.length == 2) {
			initDB_map();
			runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
			db_map.factionMemberLimit = nb;
			runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			tellraw(data.sender.nameTag, "§e•> New global limit set : " + nb);
		}
		else {
			let Fname = "";
			for (let i = 1; i < args.length - 1; i++) {
				Fname += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
			}
			Fname = Fname.trim();
			let fac = db_faction.find((f) => f.name == Fname);
			if (fac != undefined) {
				runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
				db_faction[db_faction.indexOf(fac)].memberLimit = nb;
				runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> New member limit for " + Fname + " set : " + nb);
			}
			else {
				tellraw(data.sender.nameTag, "§cFaction doesn't exist.");
			}
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cInvalid number.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Wmessage(args, data) {
	if (args.length == 4) {
		initDB_warp();
		let warp = db_warp.find((w) => w.name == args[2].replace(/"/g, ""));
		if (warp != undefined) {
			runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
			db_warp.find((w) => w.name == args[2].replace(/"/g, "")).message = args[3].replace(/"/g, "")
			runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
			tellraw(data.sender.nameTag,"§e•> Message Added :§r\n"+args[3].replace(/"/g,""));
		}
		else {
			tellraw(data.sender.nameTag, "§cThis warp doesn't exist.");
		}
	}
	else if (args.length == 3) {
		initDB_warp();
		let warp = db_warp.find((w) => w.name == args[2].replace(/"/g, ""));
		if (warp != undefined) {
			runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
			if (warp.displayMessageOnTp == true) {
				db_warp.find((w) => w.name == args[2].replace(/"/g, "")).displayMessageOnTp = false;
				tellraw(data.sender.nameTag,"§e•> Message on tp §cOFF");
			}
			else {
				db_warp.find((w) => w.name == args[2].replace(/"/g, "")).displayMessageOnTp = true;
				tellraw(data.sender.nameTag,"§e•> Message on tp §aON");
			}
			runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
		}
		else {
			tellraw(data.sender.nameTag, "§cThis warp doesn't exist.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Argument.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fhome(args, data) {
	initDB_faction();
	let fac = db_faction.find((p) => p.playerList.find((pl) => pl.nameTag == data.sender.name));
	if (fac != undefined) {
		if (fac.isFhome == true || fac.x == null) {
			runCommand(`tp "${data.sender.nameTag}" ${fac.x} ${fac.y} ${fac.z}`);
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cThis faction doesn't exist.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Wclose(args, data) {
	initDB_warp();
	let name = "";
	for (let i = 2; i < args.length; i++) {
		name += args[i].replace(/"/g, "") + " ";
	}
	name = name.trim();
	let warp = db_warp.find((w) => w.name == name);
	if (warp != undefined) {
		runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
		if (warp.isOpen) {
			db_warp.find((w) => w.name == name).isOpen = false;
			tellraw(data.sender.nameTag, "§e•> " + warp.name + " is now §cClose");
		}
		else {
			db_warp.find((w) => w.name == name).isOpen = true;
			tellraw(data.sender.nameTag, "§e•> " + warp.name + " is now §aOpen");
		}
		runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
	}
	else {
		tellraw(data.sender.nameTag, "§cThis warp doesn't exist.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Wwarp(args, data) {
	initDB_warp();
	let name = "";
	for (let i = 1; i < args.length; i++) {
		name += args[i].replace(/"/g, "") + " ";
	}
	name = name.trim();
	let warp = db_warp.find((w) => w.name == name);
	if (warp != undefined) {
		if (warp.isOpen == true) {
			if (warp.deny.length == 0) {
				if (warp.allow.length == 0) {
					if (warp.displayMessageOnTp == true) {
						tellraw(data.sender.nameTag, warp.message);
					}
					runCommandDim(`tp \"${data.sender.nameTag}\" ${warp.x} ${warp.y} ${warp.z}`, warp.dimension);
				}
				else {
					for (let i = 0; i < warp.allow.length; i++) {
						if (hasTag(data.sender.nameTag,warp.allow[i].tag)) {
							if (warp.displayMessageOnTp == true) {
								tellraw(data.sender.nameTag, warp.message);
							}
							runCommandDim(`tp \"${data.sender.nameTag}\" ${warp.x} ${warp.y} ${warp.z}`, warp.dimension);
							break;
						}
					}
				}
			}
			else {
				for (let i = 0; i < warp.deny.length; i++) {
					if (hasTag(data.sender.nameTag,warp.deny[i].tag)) {
						break;
					}
					else if (i == warp.deny.length) {
						if (warp.displayMessageOnTp == true) {
							tellraw(data.sender.nameTag, warp.message);
						}
						runCommandDim(`tp \"${data.sender.nameTag}\" ${warp.x} ${warp.y} ${warp.z}`, warp.dimension);
						//break; useless...
					}
				}
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cThis warp is closed.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cThis warp doesn't exist.");
	}
}

/**
 * +warp access add allow WarpName myTag
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Waccess(args, data) {
	initDB_warp();
	if (args[2] == "list") {
		let name = "";
		for (let i = 3; i < args.length; i++) {
			name += args[i].replace(/"/g, "") + " ";
		}
		name = name.trim();
		let warp = db_warp.find((w) => w.name == name);
		if (warp != undefined) {
			let message = "§eList of warp Access :\n Allow :";
			if (warp.allow.length != 0) {
				warp.allow.forEach(tag => {
					message += "§r\n  §e-" + tag.tag
				})
			}
			else {
				message += "\n§cNo Allow";
			}
			message += "\n\n§e Deny :";
			if (warp.deny.length != 0) {
				warp.deny.forEach(tag => {
					message += "§r\n  §e-" + tag.tag
				})
			}
			else {
				message += "\n§cNo Deny";
			}
			tellraw(data.sender.nameTag, message);
		}
		else {
			tellraw(data.sender.nameTag, "§cNo Warp Found.");
		}
	}
	else if (args.length > 5) {
		let name = "";
		for (let i = 4; i < args.length - 1; i++) {
			name += args[i].replace(/"/g, "") + " ";
		}
		name = name.trim();
		let warp = db_warp.find((w) => w.name == name);
		if (warp != undefined) {
			if (args[2] == "add") {
				if (args[3] == "allow") {
					runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
					db_warp.splice(db_warp.indexOf(warp),1);
					warp.allow.push({tag:args[args.length - 1].replace(/"/g, "")});
					db_warp.push(warp);
					runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
					tellraw(data.sender.nameTag, `§e•> Warp Access :\n you just ${args[2]} access to "${name}" \n| tag : "${args[args.length - 1].replace(/"/g, "")}"\n| mode : ${args[3]}`);
				}
				else if (args[3] == "deny") {
					runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
					db_warp.splice(db_warp.indexOf(warp),1);
					warp.deny.push({tag:args[args.length - 1].replace(/"/g, "")});
					db_warp.push(warp);
					runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
					tellraw(data.sender.nameTag, `§e•> Warp Access :\n you just ${args[2]} access to "${name}" \n| tag : "${args[args.length - 1].replace(/"/g, "")}"\n| mode : ${args[3]}`);
				}
				else {
					tellraw(data.sender.nameTag, "§cWrong Argument (should be allow | deny).");
				}
			}
			else if (args[2] == "remove") {
				if (args[3] == "allow") {
					if (warp.allow.find((w) => w.tag == args[args.length-1].replace(/"/g, "")) != undefined) {
						runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
						db_warp.splice(db_warp.indexOf(warp),1);
						warp.allow.splice(warp.allow.indexOf(warp.allow.find((w) => w.tag == args[args.length-1].replace(/"/g, ""))),1);
						db_warp.push(warp);
						runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
						tellraw(data.sender.nameTag, `§e•> Warp Access :\n you just ${args[2]} access to "${name}" \n| tag : "${args[args.length - 1].replace(/"/g, "")}"\n| mode : ${args[3]}`);
					}
					else {
						tellraw(data.sender.nameTag, `§c"${args[args.length-1].replace(/"/g, "")}" tag is not on ${name} warp`)
					}
				}
				else if (args[3] == "deny") {
					if (warp.deny.find((w) => w.tag == args[args.length-1].replace(/"/g, "")) != undefined) {
						runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
						db_warp.splice(db_warp.indexOf(warp),1);
						warp.deny.splice(warp.deny.indexOf(warp.deny.find((w) => w.tag == args[args.length-1].replace(/"/g, ""))),1);
						db_warp.push(warp);
						runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
						tellraw(data.sender.nameTag, `§e•> Warp Access :\n you just ${args[2]} access to "${name}" \n| tag : "${args[args.length - 1].replace(/"/g, "")}"\n| mode : ${args[3]}`);
					}
					else {
						tellraw(data.sender.nameTag, `§c"${args[args.length-1].replace(/"/g, "")}" tag is not on ${name} warp.`)
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cWrong Argument (should be allow | deny).");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cWrong Argument (should be add | remove).");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cThis warp doesn't exist.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Argument");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Wlist(args, data) {
	initDB_warp();
	let message = "List of Warp :"
	for (const warp of db_warp) {
		if (warp.deny.length == 0) {
			if (warp.allow.length == 0) {
				message += `\n -${warp.name}`;
			}
			else {
				for (let i = 0; i < warp.allow.length; i++) {
					if (hasTag(data.sender.nameTag, warp.allow[i].tag)) {
						message += `\n -${warp.name}`;
						break;
					}
				}
			}
		}
		else {
			for (let i = 0; i < warp.deny.length; i++) {
				if (hasTag(data.sender.nameTag, warp.deny[i].tag)) {
					break;
				}
				else if (i == warp.deny.length) {
					message += `\n -${warp.name}`;
					//break; useless...
				}
			}
		}
	}
	if (message != "List of Warp :") {
		tellraw(data.sender.nameTag, message);
	}
	else {
		tellraw(data.sender.nameTag, "§cNo warp found");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Wremove(args, data) {
	if (args.length > 2) {
		initDB_warp();
		let name = "";
		for (let i = 2; i < args.length; i++) {
			name += args[i].replace(/"/g, "") + " ";
		}
		name = name.trim();
		let warp = db_warp.find((w) => w.name == name);
		if (warp != undefined) {
			runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
			db_warp.splice(db_warp.indexOf(warp),1);
			runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
			tellraw(data.sender.nameTag, `§e•> Warp \"${name}\" removed`);
		}
		else {
			tellraw(data.sender.nameTag, "§cThis warp doesn't exist");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Argument");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Wadd(args, data) {
	if (args.length > 2) {
		let name = "";
		for (let i = 2; i < args.length; i++) {
			name += args[i].replace(/"/g, "") + " ";
		}
		name = name.trim();
		if (name.match(/^([0-9a-zA-Z ]){1,20}$/)) {
			initDB_warp();
			if (db_warp.find((w) => w.name == name) == undefined) {
				let warp = {
					name: name,
					message: "",
					displayMessageOnTp: false,
					creator: data.sender.name,
					allow: [],
					deny: [],
					isOpen: true,
					x: Math.ceil(data.sender.location.x + 0.0001) - 1,
					y: Math.ceil(data.sender.location.y - 0.4999),
					z: Math.ceil(data.sender.location.z + 0.0001) - 1,
					dimension: getCurrentDimension(data.sender),
				}
				runCommand("scoreboard players reset \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database");
				db_warp.push(warp);
				runCommand("scoreboard players set \"$db_warp(" + textToBinary(JSON.stringify(db_warp)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> §a" + name + " §eadded in " + warp.x + " " + warp.y + " " + warp.z);
			}
			else {
				tellraw(data.sender.nameTag, "§cName already used.");
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cInvalid Name.")
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Argument");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fjoin(args, data) {
	initDB_faction();
	let name = "";
	for (let i = 2; i < args.length; i++) {
		name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
	}
	name = name.trim();
	let fac = db_faction.find((f) => f.name == name);
	if (fac != undefined) {
		if (fac.isOpen == true) {
			if (fac.playerList.length < fac.memberLimit) {
				runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
				db_faction.splice(db_faction.indexOf(fac), 1);
				for (const afac of db_faction) {
					if (afac.invitList.find((p) => p.nameTag == data.sender.name)) {
						afac.invitList.splice(afac.invitList.indexOf(afac.invitList.find((p) => p.nameTag == data.sender.name)), 1)
					}
				}
				let invit = fac.invitList.find((p) => p.nameTag == data.sender.name);
				if (invit != undefined) {
					fac.invitList.splice(indexOf(invit), 1);
				}
				fac.playerList.push({ nameTag: data.sender.name, permission: "visitor" });
				db_faction.push(fac);
				runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
				for (const p of fac.playerList) {
					tellraw(db_player.find((pl) => pl.name == p.nameTag).nameTag,"§e•> §a" + data.sender.name + "join the faction !");
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cThis faction is full.")
			}
		}
		else {
			let invit = fac.invitList.find((p) => p.nameTag == data.sender.name);
			if (invit != undefined) {
				if (fac.playerList.length < fac.memberLimit) {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					db_faction.splice(db_faction.indexOf(fac), 1);
					for (const afac of db_faction) {
						if (afac.invitList.find((p) => p.nameTag == data.sender.name)) {
							afac.invitList.splice(afac.invitList.indexOf(afac.invitList.find((p) => p.nameTag == data.sender.name)), 1)
						}
					}
					fac.invitList.splice(fac.invitList.indexOf(invit), 1);
					fac.playerList.push({ nameTag: data.sender.name, permission: "visitor" });
					db_faction.push(fac);
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					for (const p of fac.playerList) {
						tellraw(db_player.find((pl) => pl.name == p.nameTag).nameTag, "§e•> " + data.sender.nameTag + " join the faction !");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cThis faction is full.")
				}
			}
			else {
				tellraw(data.sender.nameTag, "§cNo invit from this faction.");
			}
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cThis faction doesn't exist.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Finfo(args, data) {
	initDB_faction();
	if (args.length == 2) {
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name));
		if (fac == undefined) {
			tellraw(data.sender.nameTag, "§cNo info found");
		}
		else {
            let d = new Date(fac.date);
			tellraw(data.sender.nameTag, `§eName : ${fac.name}\n§r§eDescription : ${fac.description}§r§e\nCreated : ${addDateZ(d.getDay())+"/"+addDateZ(d.getMonth())+"/"+d.getFullYear()+" : "+addDateZ(d.getHours())+"h"+addDateZ(d.getMinutes())}§r§e\nMember Count : ${fac.playerList.length}/${fac.memberLimit}\n§r§eBank : ${fac.bank}\n§r§ePower : ${fac.power}`);
		}
	}
	else {
		let name = "";
		for (let i = 2; i < args.length; i++) {
			name += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
		}
		name = name.trim();
		let fac = db_faction.find((f) => f.name == name);
		if (fac == undefined) {
			tellraw(data.sender.nameTag, "§cNo info found");
		}
		else {
			tellraw(data.sender.nameTag, `§eName : ${fac.name}\n§r§eDescription : ${fac.description}§r§e\nCreated : ${addDateZ(d.getDay())+"/"+addDateZ(d.getMonth())+"/"+d.getFullYear()+" : "+addDateZ(d.getHours())+"h"+addDateZ(d.getMinutes())}§r§e\nMember Count : ${fac.playerList.length}/${fac.memberLimit}\n§r§eBank : ${fac.bank}\n§r§ePower : ${fac.power}`);
		}
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Finvit(args, data) {
	initDB_faction();
	if (args[2] == "clear") {
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
		if (fac != undefined) {
			runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
			db_faction.splice(db_faction.indexOf(fac),1);
			fac.invitList.splice(0,fac.invitList.length);
			db_faction.push(fac);
			runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
			tellraw(data.sender.nameTag, "§eAll invit has been cleared.");
		}
		else {
			tellraw(data.sender.nameTag, "§cYou can't do that");
		}
	}
	else if (args[2] == "list") {
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
		if (fac != undefined) {
			let message = "§eInvited players :§r";
			for (const p of fac.invitList) {
				message += "\n -"+p.nameTag;
			}
			if (message == "§eInvited players :§r") {
				tellraw(data.sender.nameTag, "§cNo invite found."); return;
			}
			tellraw(data.sender.nameTag, message);
		}
		else {
			tellraw(data.sender.nameTag, "§cYou can't do that.");
		}
	}
	else {
		let name = "";
		for (let i = 2; i < args.length; i++) {
			name += args[i].replace(/"/g, "").replace(/@/g, "") + " ";
		}
		name = name.trim();
		let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name && (p.permission == "leader" || p.permission == "co leader")));
		if (fac != undefined) {
			if (db_faction.find((f) => f.playerList.find((p) => p.nameTag == name)) == undefined) {
				if (fac.invitList.find((p) => p.nameTag == name) == undefined) {
					runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
					db_faction.splice(db_faction.indexOf(fac), 1);
					fac.invitList.push({ nameTag: name });
					db_faction.push(fac);
					runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
					tellraw(data.sender.nameTag, "invit send to \"" + name + "\"");
					let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
					if (player != undefined){
						tellraw(player.nameTag, "§e•> you have an invite from \"§r" + fac.name + "§r§e\" faction");
					}
				}
				else {
					tellraw(data.sender.name, "§cThis player is already invited");
				}
			}
			else {
				tellraw(data.sender.name, "§cThis player is already in a faction");
			}
		}
		else {
			tellraw(data.sender.name, "§cYou can't do that.");
		}
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fquit(args, data) {
	initDB_faction();
	let fac = db_faction.find((f) => f.playerList.find((p) => p.nameTag == data.sender.name));
	if (fac != undefined) {
		runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
		if (fac.playerList.find((p) => p.nameTag == data.sender.name && p.permission == "leader") != undefined) {
			db_faction.splice(db_faction.indexOf(fac), 1);
			db_faction.forEach( f => {
				let ally = f.ally.find((a) => a.name == fac.name);
				let enemy = f.enemy.find((e) => e.name == fac.name);
				if (ally != undefined) {
					db_faction[db_faction.indexOf(f)].ally.splice(f.ally.indexOf(ally),1);
				}
				if (enemy != undefined) {
					db_faction[db_faction.indexOf(f)].enemy.splice(f.enemy.indexOf(enemy),1);
				}
			})
		}
		else {
			db_faction[db_faction.indexOf(fac)].playerList.splice(fac.playerList.indexOf(fac.playerList.find((p) => p.nameTag == data.sender.name)), 1);
			fac.playerList.forEach(p => {
				tellraw(p.nameTag, `§e${data.sender.nameTag} leave the faction.`);
			});
		}
		runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
		tellraw(data.sender.nameTag, "§e•> You quit the \"§a" + fac.name + "§r§e\" faction");
	}
	else {
		tellraw(data.sender.nameTag, "§cno faction found");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function Fcreate(args, data) {
	if (args.length >= 3) {
		let Fname = "";
		for (let i = 2; i < args.length; i++) {
			Fname += args[i].replace(/"/g, "")[0].toUpperCase() + args[i].replace(/"/g, "").substring(1).toLowerCase() + " ";
		}
		Fname = Fname.trim();
		if (Fname.match(/^([0-9a-zA-Z ]){1,20}$/)) {
			initDB_faction();
		for (const fac of db_faction) {
			if (fac.name == Fname) {
				tellraw(data.sender.nameTag, "§eThis name is already used.");
				return;
			}
			for (const ap of fac.playerList) {
				if (ap.nameTag == data.sender.name) {
					tellraw(data.sender.nameTag, "§eplease leave your faction before join a new one");
					return;
				}
			}
		}
		let FacObject = {
			name: Fname,
			description:"",
            date:new Date().toString(),
			owner: data.sender.name,
			bank: 0,
			power: 5,
			ally: [],
			enemy: [],
			invitList:[],
			playerList: [{ nameTag: data.sender.name, permission: "leader" }],
			memberLimit: db_map.factionMemberLimit,
			isFhome:db_map.isFhome,
			x:null,
			y:null,
			z:null,
			isOpen:false,
            claim:[]
		}
		if (getCurrentDimension(data.sender) == "overworld") {
			FacObject.x = Math.ceil(data.sender.location.x + 0.0001) - 1;
			FacObject.y = Math.ceil(data.sender.location.y - 0.4999);
			FacObject.z = Math.ceil(data.sender.location.z + 0.0001) - 1;
		}
		runCommand("scoreboard players reset \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database");
		db_faction.push(FacObject);
		runCommand("scoreboard players set \"$db_faction(" + textToBinary(JSON.stringify(db_faction)) + ")\" database 1");
		tellraw(data.sender.nameTag,`§e•> §a${Fname} §e created`);
		}
		else {
			tellraw(data.sender.nameTag, "§cInvalid Name.")
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong arguments.");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function sethomelimit(args, data) {
	if (args[args.length - 1].match(/^([0-9]{1,})$/)) {
		let nb = parseInt(args[args.length - 1])
		if (args.length == 2) {
			initDB_map();
			runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
			db_map.homeLimit = nb;
			runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			tellraw(data.sender.nameTag, "§e•> New global limit set : " + args[1]);
		}
		else {
			let name = "";
			for (let i = 1; i < args.length - 1; i++) {
				name += args[i].replace(/"/g, "").replace(/@/g, "") + " ";
			}
			name = name.trim();
			let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase())
			if (player != undefined) {
				runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
				db_player[db_player.indexOf(player)].homeLimit = nb;
				runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
				tellraw(data.sender.nameTag, "§e•> New home limit for " + name + " set : " + nb);
			}
			else {
				tellraw(data.sender.nameTag, "§cPlayer not found");
			}
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cInvalid number");
	}
}

/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function sethome(args, data) {
	if (args.length >= 2) {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i] + " ";
		}
		name = name.trim();
		let player = db_player.find((p) => p.name == data.sender.name);
		if (player.home.find((h) => h.name == name) != undefined) {
			tellraw(data.sender.nameTag, "§cYou already have a home with that name.");
			return;
		}
		if (player.home.length >= player.homeLimit) {
			tellraw(data.sender.nameTag, "§cYou have reach the limit of home you can add.");
			return;
		}
		const homeObject = {
			x: Math.ceil(data.sender.location.x + 0.0001) - 1,
			y: Math.ceil(data.sender.location.y - 0.4999),
			z: Math.ceil(data.sender.location.z + 0.0001) - 1,
			dimension: getCurrentDimension(data.sender),
			name: name
		};
		runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
		db_player[db_player.indexOf(player)].home.push(homeObject);
		runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
		tellraw(data.sender.nameTag,`§e•> "§a${name}§e" home added.`);
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}
/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function delhome(args, data) {
	if (args.length >= 2) {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i] + " ";
		}
		name = name.trim();
		let player = db_player.find((p) => p.name == data.sender.name);
		if (player != undefined) {
			let home = player.home.find((h) => h.name == name);
			if (home != undefined) {
				runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
				db_player[db_player.indexOf(player)].home.splice(player.home.indexOf(home),1);
				runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
				tellraw(data.sender.nameTag, `§e•> "§a${home.name}§e" removed.`);
			}
			else {
				if (args == 3) {
					if (data.sender.hasTag(adminTag)) {
						let player = db_player.find((p) => p.name == args[1].replace(/"/g,"").replace(/@/g, ""));
						if (player != undefined) {
							let home = player.home.find((h) => h.name == args[2].replace(/"/g,""));
							if (home != undefined) {
								runCommand("scoreboard players reset \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database");
								db_player[db_player.indexOf(player)].home.splice(player.home.indexOf(home),1);
								runCommand("scoreboard players set \"$db_player(" + textToBinary(JSON.stringify(db_player)) + ")\" database 1");
								tellraw(data.sender.nameTag, `§e•> "§a${home.name}§e" removed for ${args[1]}.`);
							}
							else {
								tellraw(data.sender.nameTag, "§cHome not found.");
							}
						}
						else {
							tellraw(data.sender.nameTag, "§cPlayer not found.");
						}
					}
					else {
						tellraw(data.sender.nameTag, "§cHome not found.");
					}
				}
				else {
					tellraw(data.sender.nameTag, "§cHome not found.");
				}
			}
		}
		else {
			tellraw(data.sender.nameTag, "§cPlayer not found. (this shouldn't happen, please contact an admin).");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}
/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function home(args,data) {
	if (args.length >= 2) {
		let name = "";
		for (let i = 1; i < args.length; i++) {
			name += args[i] + " ";
		}
		name = name.trim();
		const ahome = db_player.find((p) => p.name == data.sender.name).home.find((h) => h.name == name);
		if (ahome != undefined) {
            // if (ahome.dimension != getCurrentDimension(data.sender)) {
            //     tellraw(data.sender.nameTag, "§cYou need to be in the same dimension.");return;
            // }
			runCommandDim(`tp \"${data.sender.nameTag}\" ${ahome.x} ${ahome.y} ${ahome.z}`, ahome.dimension);
		}
		else {
			tellraw(data.sender.nameTag, "§cHome not found.");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments.");
	}
}
/**
 * 
 * @param {string[]} args 
 * @param {BeforeChatEvent} data 
 * @returns 
 */
function listhome(args, data) {
	if (args.length == 1) {
		let message = "";
		const homes = db_player.find((p) => p.name == data.sender.name).home;
		for (const h of homes) {
			message += `\n§e  -"§a${h.name}§e" ${h.x}, ${h.y}, ${h.z} | ${h.dimension}`;
		}
		if (message != "") {
			tellraw(data.sender.nameTag,"§eHome List :" + message);
		}
		else {
			tellraw(data.sender.nameTag,"§cNo Home Found");
		}
	}
	else if (args.length >= 2) {
		if (data.sender.hasTag(adminTag)) {
			let name = "";
			for (let i = 1; i < args.length; i++) {
				name += args[i].replace(/"/g,"").replace(/@/g, "") + " ";
			}
			name = name.trim();
			
			let player = db_player.find((p) => p.name.toLowerCase() == name.toLowerCase());
			let message = "";
			if (player != undefined) {
				for (const ahome of player.home) {
					message += `\n§e  -"§a${ahome.name}§e" ${ahome.x}, ${ahome.y}, ${ahome.z} | ${ahome.dimension}`;
				}
			}
			else {
				tellraw(data.sender.nameTag,"§cNo Player Found.");
				return;
			}
			if (message != "") {
				tellraw(data.sender.nameTag,"§eHome List :" + message);
			}
			else {
				tellraw(data.sender.nameTag,"§cNo Home Found");
			}
		}
		else {
			tellraw(data.sender.nameTag ,"§cYou are not allowed to use this command");
		}
	}
	else {
		tellraw(data.sender.nameTag, "§cWrong Arguments");
	}
}

function hasTag(name, tag) {
	let allTags = runCommand(`tag "${name}" list`).statusMessage.match(/§a.*?§r/g)?.map(v => v.slice(2, -2))
	if (allTags == null) {
		return false
	}
	let incTag = allTags.includes(tag)
	if (incTag == true) {
		return true
	}
}

/**
 * 
 * @param {string} command 
 * @returns {Object.statusMessage}
 */
function runCommand(command) {
	try {
		return { error: false, ...world.getDimension(`overworld`).runCommand(command) };
	} catch (error) {
		return { error: true };
	}
}
/**
 * 
 * @param {string} command 
 * @param {Dimension} dimension
 * @returns {Boolean}
 */
function runCommandDim(command, dimension) {
	try {
		return { error: false, ...world.getDimension(dimension).runCommand(command)};//to fix at the next update
	} catch (error) {
		return { error: true };
	}
}

/**
 * 
 * @param {string} score
 * @example getScoreboardValue("fakePlayer scoreName") 
 * @returns 
 */
function getScoreboardValue(score) {
	var value = runCommand(`scoreboard players test ${score} * *`).statusMessage;
	let i = 0;

	if (value == undefined) { return 0; }
	while (!(value.substr(0, 1).match(/[0-9]/) || value.substr(0, 1) == "-")) { value = value.substr(1); }
	while (value.substr(i, 1 + i).match(/[ 0-9]/) || value.substr(i, 1 + i) == "-") { i++; }
	return (value.substr(0, i));
}


/**
 * @param {Player} player 
 * @returns current dimention
 * @example getCurrentDimention("Mister Art43")
 */
function getCurrentDimension(player) //ultimate trick
{
	const x = player.location.x;
	const y = player.location.y;
	const z = player.location.z;
	const cmd = `testfor @e[name="${player.nameTag}",x=${x},y=${y},z=${z},r=10]`;
	try {
		runCommand("say " + world.getDimension("overworld").runCommand(cmd)).statusMessage;
		return "overworld";
	}
	catch (er1) {
		try {
			runCommand("say " + world.getDimension("nether").runCommand(cmd)).statusMessage;
			return "nether";
		}
		catch (er2) {
			try {
				runCommand("say " + world.getDimension("the end").runCommand(cmd)).statusMessage;
				return "the end";
			}
			catch (er3) { runCommand("say §eyour in an unknow dimension ?!? : §r" + er3); } //wtf should be impossible right ?
		}
	}
	return false;
}
function log(text) { runCommand(`tellraw @a[tag=log] {"rawtext":[{"text":"§7{log} §r${text.replace(/"/g, "\'")}"}]}`) }

/**
 * Convert string to binary
 * @param text
 * @returns {string}
 */
 function textToBinary(text) {
	return text.split("").map((char) => {
		return char.charCodeAt(0).toString(2);
	}).join(" ");
}

/**
 * Convert binary to string
 * @param binary
 * @returns {string}
 */
 function binaryToText(binary) {
	return binary.split(" ").map((char) => {
		return String.fromCharCode(parseInt(char, 2));
	}).join("");
}

/**
 * @param {RegExp} regexObj
 * @example getBinary(/(?<=\$db_player\()[0-1\s]+(?=\))/g);
 * @returns {string[]} string array
 */
function getBinary(regexObj) {
	try {
		let data = runCommand(`scoreboard players list`);
		if (!data?.statusMessage)
			return null;
		return data.statusMessage.match(regexObj);
	} catch (e) {
		runCommand(`say getBinary error: ${e}`);
	}
}

/**
 * @param {Player.nameTag} selector
 * @param {String} selector 
 * @param {String} text 
 */
function tellraw(selector, text) {
	if (!selector.match(/@/g)) {
		runCommand(`tellraw "${selector}" {"rawtext":[{"text":"${text.replace(/"/g, "\'")}"}]}`);
	}
	else {
		runCommand(`tellraw ${selector} {"rawtext":[{"text":"${text.replace(/"/g, "\'")}"}]}`);
	}
}

/**
 * 
 * @returns {String} uuid
 */
function uuid() { // Public Domain/MIT
	var d = new Date().getTime();//Timestamp
	var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16;//random number between 0 and 16
		if(d > 0){//Use timestamp until depleted
			r = (d + r)%16 | 0;
			d = Math.floor(d/16);
		} else {//Use microseconds since page-load if supported
			r = (d2 + r)%16 | 0;
			d2 = Math.floor(d2/16);
		}
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

/**
 * findTagsStartWith("Mister Art43", "Admin");
 * @param {String} name 
 * @param {String} tag 
 * @returns {String[]}
 */
function findTagsStartWith(name, tag) {
	const listTag = runCommand(`tag @a[name="${name}"] list`).statusMessage.split(' ');
	const tags = [];
	for (const aTag of listTag) {
		if (aTag.replace('§a', '').startsWith(tag)) tags.push(aTag.replace('§a', '').replace('§r', '').replace(',', ' ').trim())
	}
	return (tags);
}

function addDateZ(n) {
    if (n <= 9)
      return "0" + n;
    return n
}

function initDB_map() {
	if (db_map == undefined) {
		try {
			db_map = JSON.parse(binaryToText(getBinary(/(?<=\$db_map\()[0-1\s]+(?=\))/g).join("")));
			if (db_map == undefined) {
				log("§7[DB] no map database found, creating a new one. try");
				runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
				db_map = { homeLimit: 3, factionMemberLimit: 5, scoreMoney: "money", isFhome: false, prefix: prefix, customName:false };
				runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			}
		}
		catch (e) {
			log("§7[DB] no map database found, creating a new one. catch");
			try {
				runCommand("scoreboard players reset \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database");
				db_map = { homeLimit: 3, factionMemberLimit: 5, scoreMoney: "money", isFhome: false, prefix: prefix, customName:false };
				runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			}
			catch (er) {
				db_map = { homeLimit: 3, factionMemberLimit: 5, scoreMoney: "money", isFhome: false, prefix: prefix, customName:false };
				runCommand("scoreboard players set \"$db_map(" + textToBinary(JSON.stringify(db_map)) + ")\" database 1");
			}
			log("§7[DB] map fixed");
		}
	}
}

function initDB_faction() {
	if (db_faction.length == 0) {
		try {
			db_faction = JSON.parse(binaryToText(getBinary(/(?<=\$db_faction\()[0-1\s]+(?=\))/g).join("")));
		}
		catch (e) {
			log("§7[DB] can't find any databse for faction, creating a new one");
		}
	}
}

function initDB_warp() {
	if (db_warp.length == 0) {
		try {
			db_warp = JSON.parse(binaryToText(getBinary(/(?<=\$db_warp\()[0-1\s]+(?=\))/g).join("")));
		}
		catch (e) {
			log("§7[DB] can't find any databse for warp, creating a new one");
		}
	}
}