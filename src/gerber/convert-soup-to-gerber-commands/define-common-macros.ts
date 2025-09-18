import type { AnyGerberCommand } from "../any_gerber_command"
import { gerberBuilder } from "../gerber-builder"

export const defineCommonMacros = (glayer: Array<AnyGerberCommand>) => {
  glayer.push(
    ...gerberBuilder()
      .add("comment", { comment: "APERTURE MACROS START" })
      .add("define_macro_aperture_template", {
        macro_name: "HORZPILL",
        template_code: `
0 Horizontal pill (stadium) shape macro*
0 Parameters:*
0 $1 = Straight section length*
0 $2 = Total height*
0 $3 = Circle diameter*
0 $4 = Half straight length (circle center offset)*
0 21 = Center Line(Exposure, Width, Height, Center X, Center Y, Rotation)*
0 1 = Circle(Exposure, Diameter, Center X, Center Y, Rotation)*
21,1,$1,$2,0.0,0.0,0.0*
1,1,$3,0.0-$4,0.0*
1,1,$3,$4,0.0*
`.trim(),
      })
      .add("define_macro_aperture_template", {
        macro_name: "VERTPILL",
        template_code: `
0 Vertical pill (stadium) shape macro*
0 Parameters:*
0 $1 = Total width*
0 $2 = Straight section length*
0 $3 = Circle diameter*
0 $4 = Half straight length (circle center offset)*
0 21 = Center Line(Exposure, Width, Height, Center X, Center Y, Rotation)*
21,1,$1,$2,0.0,0.0,0.0*
1,1,$3,0.0,0.0-$4*
1,1,$3,0.0,$4*
`.trim(),
      })
      .add("define_macro_aperture_template", {
        macro_name: "RoundRect",
        template_code: `
0 Rectangle with rounded corners*
0 $1 Corner radius*
0 $2 $3 $4 $5 $6 $7 $8 $9 X,Y Position of each corner*
0 Polygon box body*
4,1,4,$2,$3,$4,$5,$6,$7,$8,$9,$2,$3,0*
0 Circles for rounded corners*
1,1,$1+$1,$2,$3*
1,1,$1+$1,$4,$5*
1,1,$1+$1,$6,$7*
1,1,$1+$1,$8,$9*
0 Rectangles between the rounded corners*
20,1,$1+$1,$2,$3,$4,$5,0*
20,1,$1+$1,$4,$5,$6,$7,0*
20,1,$1+$1,$6,$7,$8,$9,0*
20,1,$1+$1,$8,$9,$2,$3,0*
`.trim(),
      })
      .add("comment", { comment: "APERTURE MACROS END" })
      .build(),
  )
}
