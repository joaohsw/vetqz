import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfUpload from '../../src/components/PdfUpload';

describe('PDF selection', () => {
  it('clears without clicking the picker and allows selecting the same file again', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const parentClick = vi.fn();
    const {container} = render(<div onClick={parentClick}><PdfUpload language="pt-BR" onUpload={onUpload} /></div>);
    const input = container.querySelector('input[type=file]');
    const file = new File(['%PDF-1.7'], 'atlas.pdf', {type:'application/pdf'});
    await user.upload(input, file);
    const picker = vi.fn(); input.addEventListener('click', picker);
    const clear = container.querySelector('#pdf-clear-btn');
    parentClick.mockClear();
    let clickEvent;
    clear.addEventListener('click', (event) => { clickEvent = event; });
    await user.click(clear);
    expect(picker).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
    expect(clickEvent.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    expect(screen.queryByText('atlas.pdf')).toBeNull();
    await user.upload(input, file);
    await user.click(container.querySelector('#pdf-upload-btn'));
    expect(onUpload).toHaveBeenCalledWith(file);
  });
  it.each([15,30,50])('accepts %s MiB and rejects sizes above 50 MiB', async (size) => {
    const {container} = render(<PdfUpload language="pt-BR" />);
    const file = new File(['pdf'], 'atlas.pdf', {type:'application/pdf'});
    Object.defineProperty(file,'size',{value:size*1024*1024});
    fireEvent.change(container.querySelector('input'),{target:{files:[file]}});
    expect(container.querySelector('#pdf-upload-btn')).not.toBeNull();
    const oversized = new File(['pdf'], 'too-big.pdf', {type:'application/pdf'});
    Object.defineProperty(oversized,'size',{value:50*1024*1024+1});
    fireEvent.change(container.querySelector('input'),{target:{files:[oversized]}});
    expect(container.querySelector('#pdf-upload-btn')).toBeNull();
    expect(screen.getByText(/50 MB/)).toBeTruthy();
  });
  it('ignores drops while an upload is running', () => {
    const {container} = render(<PdfUpload language="pt-BR" isUploading />);
    fireEvent.drop(container.querySelector('#pdf-drop-zone'),{dataTransfer:{files:[new File(['pdf'],'other.pdf',{type:'application/pdf'})]}});
    expect(screen.queryByText('other.pdf')).toBeNull();
  });
});
