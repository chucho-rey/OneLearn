/* Punto de entrada del paquete de docx para OneLearn: solo lo que usa assets/js/exportar-docx.js,
   en una variable global (window.Docx) para usarlo desde scripts clásicos. Incluye latexToMath, que convierte
   las ecuaciones en LaTeX en ecuaciones nativas de Word. */
import {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Header,Footer,PageNumber,NumberFormat,TableOfContents,
  FootnoteReferenceRun,ImageRun,Table,TableRow,TableCell,WidthType,BorderStyle,PageBreak,SectionType,LineRuleType,
  ExternalHyperlink,InternalHyperlink,Bookmark,SequentialIdentifier,TabStopType,TabStopPosition,LeaderType,VerticalAlign,
  TableLayoutType,ShadingType,Tab,StyleLevel,convertMillimetersToTwip} from 'docx';
import {Math as MathDocx,MathRun,latexToMath} from 'docx/math';

window.Docx={Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Header,Footer,PageNumber,NumberFormat,TableOfContents,
  FootnoteReferenceRun,ImageRun,Table,TableRow,TableCell,WidthType,BorderStyle,PageBreak,SectionType,LineRuleType,
  ExternalHyperlink,InternalHyperlink,Bookmark,SequentialIdentifier,TabStopType,TabStopPosition,LeaderType,VerticalAlign,
  TableLayoutType,ShadingType,Tab,StyleLevel,convertMillimetersToTwip,Math:MathDocx,MathRun,latexToMath};
