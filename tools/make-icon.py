from PIL import Image, ImageDraw

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def rgb(hexs):
    hexs = hexs.lstrip("#")
    return tuple(int(hexs[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

bg = rgb("#0B0D10")
surface = rgb("#171C22")
edge = rgb("#303A45")
amber = rgb("#F5B841")
ink = rgb("#F2F5F7")
muted = rgb("#8A97A3")

d.rounded_rectangle([0, 0, S - 1, S - 1], radius=210, fill=bg)

d.rounded_rectangle([232, 232, 792, 704], radius=56, fill=surface, outline=edge, width=12)
d.rounded_rectangle([280, 280, 840, 752], radius=56, fill=surface, outline=amber, width=12)
d.rounded_rectangle([328, 328, 888, 800], radius=56, fill=surface, outline=ink, width=16)

d.rounded_rectangle([392, 424, 560, 472], radius=24, fill=amber)
d.rounded_rectangle([392, 512, 784, 544], radius=16, fill=muted)
d.rounded_rectangle([392, 584, 712, 616], radius=16, fill=muted)
d.rounded_rectangle([392, 656, 600, 688], radius=16, fill=muted)

img.save("app-icon.png")
print("app-icon.png escrito")
