import { AbstractMaskSystem } from './AbstractMaskSystem';

/**
 * System plugin to the renderer to manage stencils (used for masks).
 *
 * @class
 * @extends PIXI.System
 * @memberof PIXI.systems
 */
export class StencilSystem extends AbstractMaskSystem
{
    /**
     * @param {PIXI.Renderer} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        super(renderer);

        this.glConst = WebGLRenderingContext.STENCIL_TEST;
    }

    getStackLength()
    {
        const maskData = this.maskStack[this.maskStack.length - 1];

        if (maskData)
        {
            return maskData._stencilCounter;
        }

        return 0;
    }

    /**
     * Applies the Mask and adds it to the current stencil stack.
     *
     * @param {PIXI.MaskData} maskData - The mask data
     */
    push(maskData)
    {
        const element = maskData.element;
        const { gl } = this.renderer;
        const prevMaskCount = maskData._stencilCounter;

        if (prevMaskCount === 0)
        {
            // force use stencil texture in current framebuffer
            this.renderer.framebuffer.forceStencil();
            gl.enable(gl.STENCIL_TEST);
        }

        maskData._stencilCounter++;

        // Increment the reference stencil value where the new mask overlaps with the old ones.
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.EQUAL, prevMaskCount, this._getBitwiseMask());
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);

        element.renderable = true;
        element.render(this.renderer);
        this.renderer.batch.flush();
        element.renderable = false;

        this._useCurrent();
    }

    /**
     * Pops stencil mask. MaskData is already removed from stack
     *
     * @param {PIXI.DisplayObject} displayObject - element of popped mask data
     */
    pop(displayObject)
    {
        const gl = this.renderer.gl;

        if (this.getStackLength() === 0)
        {
            // the stack is empty!
            gl.disable(gl.STENCIL_TEST);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.clearStencil(0);
        }
        else
        {
            // Decrement the reference stencil value where the popped mask overlaps with the other ones
            gl.colorMask(false, false, false, false);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);

            displayObject.renderable = true;
            displayObject.render(this.renderer);
            this.renderer.batch.flush();
            displayObject.renderable = false;

            this._useCurrent();
        }
    }

    /**
     * Setup renderer to use the current stencil data.
     * @private
     */
    _useCurrent()
    {
        const gl = this.renderer.gl;

        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.EQUAL, this.getStackLength(), this._getBitwiseMask());
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    }

    /**
     * Fill 1s equal to the number of acitve stencil masks.
     * @private
     * @return {number} The bitwise mask.
     */
    _getBitwiseMask()
    {
        return (1 << this.getStackLength()) - 1;
    }
}
