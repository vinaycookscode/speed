
import os
from PIL import Image

def generate_icons(source_path, output_dir):
    if not os.path.exists(source_path):
        print(f"Error: Source file '{source_path}' not found.")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
    
    try:
        with Image.open(source_path) as img:
            # Ensure image is square
            width, height = img.size
            if width != height:
                 print("Warning: Source image is not square. It will be cropped/resized.")
            
            # Convert to RGBA to handle transparency if needed (though prompt said white background, icons often need transparency)
            # If the generated image has a white background, we might want to make it transparent or keep it.
            # For now, we'll keep it as is.
            img = img.convert("RGBA")

            for size in sizes:
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
                output_filename = f"icon_{size}x{size}.png"
                output_path = os.path.join(output_dir, output_filename)
                resized_img.save(output_path)
                print(f"Generated: {output_path}")
                
            # specific format for electron mac (icns) or win (ico) often requires special tools, 
            # but usually a 512x512 or 1024x1024 png is enough for electron-builder to generate them if configured.
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Assuming the generated image will be placed at public/assets/logo/speed_logo_base.png
    # But wait, the generate_image tool saves to artifacts. I need to move it or point to it.
    # The user instruction implies I should access files in workspaces. 
    # The generate_image tool saves to the artifact directory.
    # I will have to copy it to the workspace first.
    
    # We will accept arguments or hardcode for this specific task
    source = "public/assets/logo/speed_logo_base.png"
    out = "public/assets/logo"
    generate_icons(source, out)
