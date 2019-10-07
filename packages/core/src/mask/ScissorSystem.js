import { AbstractMaskSystem } from './AbstractMaskSystem';

/**
 * System plugin to the renderer to manage scissor rects (used for masks).
 *
 * @class
 * @extends PIXI.System
 * @memberof PIXI.systems
 */
export class ScissorSystem extends AbstractMaskSystem
{
    /**
     * @param {PIXI.Renderer} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        super(renderer);

        this.glConst = WebGLRenderingContext.SCISSOR_TEST;
    }

    getStackLength()
    {
        const maskData = this.maskStack[this.maskStack.length - 1];

        if (maskData)
        {
            return maskData._scissorCounter;
        }

        return 0;
    }

    /**
     * Applies the Mask and adds it to the current stencil stack. @alvin
     *
     * @param {PIXI.MaskData} maskData - The mask data
     */
    push(maskData)
    {
        const maskObject = maskData.maskObject;

        maskObject.renderable = true;

        const prevData = maskData._scissorRect;
        const bounds = maskObject.getBounds(true);
        const { gl } = this.renderer;

        maskObject.renderable = false;

        if (prevData)
        {
            bounds.fit(prevData);
        }
        else
        {
            gl.enable(gl.SCISSOR_TEST);
        }

        maskData._scissorCounter++;
        maskData._scissorRect = bounds;
        this._useCurrent();
    }

    /**
     * Pops scissor mask. MaskData is already removed from stack
     */
    pop()
    {
        const { gl } = this.renderer;

        if (this.getStackLength() > 0)
        {
            this._useCurrent();
        }
        else
        {
            gl.disable(gl.SCISSOR_TEST);
        }
    }

    /**
     * Setup renderer to use the current scissor data.
     * @private
     */
    _useCurrent()
    {
        const rect = this.maskStack[this.maskStack.length - 1]._scissorRect;
        const rt = this.renderer.renderTexture.current;
        const transform = this.renderer.projection.transform;
        let resolution = this.renderer.resolution;
        let x = rect.x;
        let y = rect.y;

        if (transform)
        {
            x += transform.tx;
            y += transform.ty;
        }
        if (rt)
        {
            resolution = rt.resolution;
            y = y * resolution;
        }
        else
        {
            y = this.renderer.height - ((y + rect.height) * resolution);
        }

        this.renderer.gl.scissor(
            x * resolution,
            y,
            rect.width * resolution,
            rect.height * resolution
        );
    }
}
