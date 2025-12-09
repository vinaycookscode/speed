
from PIL import Image
import sys

def remove_black_background(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Change black pixels (and near black) to transparent
            # Adjust threshold as needed
            if item[0] < 50 and item[1] < 50 and item[2] < 50:
                newData.append((0, 0, 0, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully saved transparent image to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_black_bg.py <input_path> <output_path>")
    else:
        remove_black_background(sys.argv[1], sys.argv[2])
