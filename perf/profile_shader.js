const TOKENS = ["textureGrad", "floor", "fract", "smoothstep", "exp", "sqrt", "min", "max", "mix"]

function operators(source) {
  const divisions = source.split("/").length - 1,
    multiplies = source.split("*").length - 1,
    branches = source.split(/\bif\s*\(/u).length - 1

  return { divisions, multiplies, branches }
}

export default function profileShader(source) {
  const stripped = source.replaceAll(/\/\/[^\n]*/gu, ""),
    calls = {}

  for (const token of TOKENS) {
    const wanted = new RegExp(`\\b${token}\\s*\\(`, "gu"),
      matches = stripped.match(wanted)

    calls[token] = matches ? matches.length : 0
  }

  return { statements: stripped.split(";").length - 1, ...operators(stripped), calls }
}
