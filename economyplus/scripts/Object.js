import { dimensionName, world } from "mojang-minecraft";

export class Object{
    constructor(){}
    
}
class Player {
    constructor(){}
}
class Warp {
    /**
     * Warp Object
     * @param {String} name 
     * @param {String} message 
     * @param {Boolean} displayMessageOnTp 
     * @param {String} creator 
     * @param {Array} allow 
     * @param {Array} deny 
     * @param {Boolean} isOpen 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {dimensionName} dimension
     */
    constructor(name,
        message,
        displayMessageOnTp,
        creator,
        allow,
        deny,
        isOpen,
        x,
        y,
        z,
        dimension) {
            this.name = name;
            this.message = message;
            this.displayMessageOnTp = displayMessageOnTp;
            this.creator = creator;
            this.allow = allow;
            this.deny = deny;
            this.isOpen = isOpen;
            this.x = x;
            this.y = y;
            this.z = z;
            this.dimension = dimension;
        }
}
class Faction {
    constructor(){}
}
class map {
    constructor(){}
}
class home {
    constructor(){}
}