const plantUml = require('node-plantuml-2')
const fs = require('fs')

/**
 * Reads the diagrams folder for valid PlantUML files and generates the corresponding PNG files in the `render` sub-folder.
 *
 * @param {string} content The content of the PlantUML file to render.
 * @param {string} [theme] Optional. Specifies a theme to use. Default is `mimeograph`.
 *
 * @returns {void}
 */
function renderDiagrams(content, theme = 'mimeograph') {
  const res = plantUml.generate(content, { format: 'png', theme, autoFix: true })

  return res.out
}

;(async () => {
  try {
    // Paths to read.
    const diagramsPath = `${__dirname}/diagrams`
    const renderPath = `${diagramsPath}/render`

    // Read files within the diagrams folder.
    const files = await fs.promises.readdir(diagramsPath)

    // Filter for valid PlantUML files.
    const plantUmlFiles = files.filter(
      (file) => file.endsWith('.puml') || file.endsWith('.plantuml')
    )

    // Render each valid PlantUML file.
    for (const file of plantUmlFiles) {
      const content = await fs.promises.readFile(`${diagramsPath}/${file}`, 'utf-8')

      console.log(`Rendering diagram: ${file}`)

      const out = renderDiagrams(content)

      out.pipe(fs.createWriteStream(`${renderPath}/${file.replace(/\.(puml|plantuml)$/, '.png')}`))
    }

    console.log('Diagrams rendered successfully.')
  } catch (error) {
    console.error('Error rendering diagrams:', error)
  }
})()
