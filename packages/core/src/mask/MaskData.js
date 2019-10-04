import { MASK_TYPES } from '@pixi/constants';

/**
 * Component for masked elements
 *
 * Holds mask mode and temporary data about current mask
 *
 * @class
 * @memberof PIXI
 */
export class MaskData
{
    constructor()
    {
        /**
         * Mask type
         * @member {PIXI.MASK_TYPES}
         */
        this.type = MASK_TYPES.NONE;

        /**
         * Whether we know the mask type beforehand
         * @member {boolean}
         * @default true
         */
        this.autoDetect = true;

        /**
         * Which element we use to mask
         * @member {PIXI.DisplayObject}
         */
        this.element = null;

        /**
         * Whether it belongs to MaskSystem pool
         * @type {boolean}
         */
        this.pooled = false;

        this.reset();
    }

    /**
     * resets the mask data after popMask()
     */
    reset()
    {
        if (this.pooled)
        {
            this.element = null;

            this.type = MASK_TYPES.NONE;

            this.autoDetect = true;
        }

        /**
         * Stencil counter above the mask in stack
         * @member {number}
         * @private
         */
        this._stencilCounter = 0;
        /**
         * Scissor counter above the mask in stack
         * @member {number}
         * @private
         */
        this._scissorCounter = 0;

        /**
         * Targeted element. Temporary variable set by MaskSystem
         * @member {PIXI.DisplayObject}
         * @private
         */
        this._target = null;
    }
}
