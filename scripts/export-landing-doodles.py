"""Export the authored V2 SVG symbols as individual icons and a vector sheet."""

import argparse
import copy
from pathlib import Path
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "apps/web/public/brand/v2/doodles"


def element(name, **attributes):
    return ET.Element(f"{{{SVG}}}{name}", attributes)


def serialized(node):
    ET.indent(node, space="  ")
    return ET.tostring(node, encoding="unicode") + "\n"


def portable_artwork(node):
    artwork = copy.deepcopy(node)
    palette = {
        "var(--doodle-fill, #f3c5df)": "#f3c5df",
        "var(--doodle-highlight, #fff1f8)": "#fff1f8",
    }
    for child in artwork.iter():
        for key, value in list(child.attrib.items()):
            if value in palette:
                child.set(key, palette[value])
    return artwork


def exports():
    source = ET.parse(ASSETS / "icons.svg").getroot()
    symbols = list(source)
    assert len(symbols) == 11
    assert len({symbol.attrib["id"] for symbol in symbols}) == len(symbols)
    output = {}
    sheet = element(
        "svg", viewBox=f"0 0 900 {((len(symbols) + 2) // 3) * 300}",
        width="900", height=str(((len(symbols) + 2) // 3) * 300),
        role="img", **{"aria-label": "Fresh Phones hand-drawn SVG icon collection"},
    )
    sheet.append(element("rect", width="900", height=sheet.attrib["height"], fill="#eaf4ff"))
    for index, symbol in enumerate(symbols):
        name = symbol.attrib["id"]
        label = name.replace("-", " ").title()
        icon = element(
            "svg", viewBox="0 0 40 40", width="40", height="40",
            color="#82678f", role="img", **{"aria-label": label},
        )
        for child in symbol:
            icon.append(portable_artwork(child))
        output[f"{name}.svg"] = serialized(icon)
        x, y = index % 3 * 300, index // 3 * 300
        sheet.append(element(
            "rect", x=str(x + 10), y=str(y + 10), width="280", height="280",
            rx="32", fill="#f6faff" if index % 2 == 0 else "#d7edff",
        ))
        if index == 4:
            sheet.append(element(
                "circle", cx=str(x + 150), cy=str(y + 132), r="106", fill="#fff1f8",
            ))
        drawing = element(
            "g", transform=f"translate({x + 74} {y + 45}) scale(3.8)",
            color="#82678f",
        )
        for child in symbol:
            drawing.append(portable_artwork(child))
        sheet.append(drawing)
        text = element(
            "text", x=str(x + 150), y=str(y + 257), fill="#14266b",
            **{"text-anchor": "middle", "font-family": "system-ui, sans-serif",
               "font-size": "17", "font-weight": "650"},
        )
        text.text = label
        sheet.append(text)
    output["preview.svg"] = serialized(sheet)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    generated = exports()
    for name, content in generated.items():
        destination = ASSETS / name
        if arguments.check:
            assert destination.read_text() == content, f"Stale SVG export: {name}"
        else:
            destination.write_text(content)
    print(f"{len(generated) - 1} individual SVGs and the standalone vector sheet match the master symbols.")


if __name__ == "__main__":
    main()
