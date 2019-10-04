import { System } from '../System';
import { MaskData } from './MaskData';
import { SpriteMaskFilter } from '../filters/spriteMask/SpriteMaskFilter';
import { MASK_TYPES } from '@pixi/constants';

/**
 * System plugin to the renderer to manage masks.
 *
 * @class
 * @extends PIXI.System
 * @memberof PIXI.systems
 */
export class MaskSystem extends System
{
    /**
     * @param {PIXI.Renderer} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        super(renderer);

        /**
         * Target to mask
         * @member {PIXI.DisplayObject}
         * @readonly
         */
        this.scissorRenderTarget = null;

        /**
         * Enable scissor
         * @member {boolean}
         * @readonly
         */
        this.enableScissor = false;

        /**
         * Pool of used sprite mask filters
         * @member {PIXI.SpriteMaskFilter[]}
         * @readonly
         */
        this.alphaMaskPool = [];

        /**
         * Pool of mask data
         * @member {PIXI.MaskData[]}
         * @readonly
         */
        this.maskDataPool = [];

        this.maskStack = [];

        /**
         * Current index of alpha mask pool
         * @member {number}
         * @default 0
         * @readonly
         */
        this.alphaMaskIndex = 0;
    }

    /**
     * Changes the mask stack that is used by this System.
     *
     * @param {PIXI.MaskData[]} maskStack - The mask stack
     */
    setMaskStack(maskStack)
    {
        this.maskStack = maskStack;
        this.renderer.scissor.setMaskStack(maskStack);
        this.renderer.stencil.setMaskStack(maskStack);
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     * Renderer batch must be flushed beforehand.
     *
     * @param {PIXI.DisplayObject} target - Display Object to push the mask to
     * @param {PIXI.MaskData|PIXI.Sprite|PIXI.Graphics|PIXI.DisplayObject} maskData - The masking data.
     */
    push(target, maskData)
    {
        if (!maskData.isMaskData)
        {
            const d = this.maskDataPool.pop() || new MaskData();

            d.pooled = true;
            d.maskObject = maskData;
            maskData = d;
        }

        if (maskData.autoDetect)
        {
            this.detect(maskData);
        }

        maskData.copyCounters(this.maskStack[this.maskStack.length - 1]);
        maskData._target = target;

        switch (maskData.type)
        {
            case MASK_TYPES.SCISSOR:
                this.maskStack.push(maskData);
                this.renderer.scissor.push(maskData);
                break;
            case MASK_TYPES.STENCIL:
                this.maskStack.push(maskData);
                this.renderer.stencil.push(maskData);
                break;
            case MASK_TYPES.SPRITE:
                maskData.copyCounters(null);
                this.pushSpriteMask(maskData);
                this.maskStack.push(maskData);
                break;
            default:
                break;
        }
    }

    /**
     * Removes the last mask from the mask stack and doesn't return it.
     * Renderer batch must be flushed beforehand.
     *
     * @param {PIXI.DisplayObject} target - Display Object to pop the mask from
     */
    pop(target)
    {
        const maskData = this.maskStack.pop();

        if (!maskData || maskData._target !== target)
        {
            // target mismatch, what to do?
            return;
        }

        switch (maskData.type)
        {
            case MASK_TYPES.SCISSOR:
                this.renderer.scissor.pop();
                break;
            case MASK_TYPES.STENCIL:
                this.renderer.stencil.pop(maskData.maskObject);
                break;
            case MASK_TYPES.SPRITE:
                this.popSpriteMask();
                break;
            default:
                break;
        }

        maskData.reset();

        if (maskData.pooled)
        {
            this.maskDataPool.push(maskData);
        }
    }

    /**
     * Sets type of MaskData based on its maskObject
     * @param {PIXI.MaskData} maskData
     */
    detect(maskData)
    {
        const maskObject = maskData.maskObject;

        if (maskObject.isSprite)
        {
            maskData.type = MASK_TYPES.SPRITE;

            return;
        }
        maskData.type = MASK_TYPES.STENCIL;
        // detect scissor in graphics
        if (this.enableScissor
            && maskObject.isFastRect
            && maskObject.isFastRect())
        {
            const matrix = maskObject.worldTransform;

            let rot = Math.atan2(matrix.b, matrix.a);

            // use the nearest degree to 0.01
            rot = Math.round(rot * (180 / Math.PI) * 100);

            if (rot % 9000 === 0)
            {
                maskData.type = MASK_TYPES.SCISSOR;
            }
        }
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {PIXI.MaskData} maskData - Sprite to be used as the mask
     */
    pushSpriteMask(maskData)
    {
        const { maskObject } = maskData;
        const target = maskData._target;
        let alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex];

        if (!alphaMaskFilter)
        {
            alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex] = [new SpriteMaskFilter(maskObject)];
        }

        alphaMaskFilter[0].resolution = this.renderer.resolution;
        alphaMaskFilter[0].maskSprite = maskObject;

        const stashFilterArea = target.filterArea;

        target.filterArea = maskObject.getBounds(true);
        this.renderer.filter.push(target, alphaMaskFilter);
        target.filterArea = stashFilterArea;

        this.alphaMaskIndex++;
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    popSpriteMask()
    {
        this.renderer.filter.pop();
        this.alphaMaskIndex--;
    }
}
