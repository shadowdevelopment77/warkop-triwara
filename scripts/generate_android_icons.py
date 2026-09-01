import os
from PIL import Image, ImageDraw

def generate_icons():
    source_path = 'logo-triwara.png'
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found")
        return

    img = Image.open(source_path).convert('RGBA')

    sizes = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }

    base_res = 'android/app/src/main/res'

    for folder, (icon_size, fg_size) in sizes.items():
        target_dir = os.path.join(base_res, folder)
        os.makedirs(target_dir, exist_ok=True)

        # 1. Standard ic_launcher.png
        launcher_img = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        launcher_path = os.path.join(target_dir, 'ic_launcher.png')
        launcher_img.save(launcher_path, 'PNG')

        # 2. Round ic_launcher_round.png
        mask = Image.new('L', (icon_size, icon_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, icon_size, icon_size), fill=255)
        round_img = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
        round_img.paste(launcher_img, (0, 0), mask=mask)
        round_path = os.path.join(target_dir, 'ic_launcher_round.png')
        round_img.save(round_path, 'PNG')

        # 3. Adaptive Foreground ic_launcher_foreground.png
        # Adaptive icons have safe zone in the center 66% (e.g. 72dp inside 108dp)
        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        content_size = int(fg_size * 0.72)
        scaled_content = img.resize((content_size, content_size), Image.Resampling.LANCZOS)
        offset = (fg_size - content_size) // 2
        fg_canvas.paste(scaled_content, (offset, offset))
        fg_path = os.path.join(target_dir, 'ic_launcher_foreground.png')
        fg_canvas.save(fg_path, 'PNG')

        print(f"Generated icons for {folder}: {icon_size}x{icon_size} & FG {fg_size}x{fg_size}")

    print("All Android launcher icons successfully generated!")

if __name__ == '__main__':
    generate_icons()
