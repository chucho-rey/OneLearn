/* Punto de entrada del paquete de docx para OneBook: solo lo que usa assets/js/exportar-docx.js,
   en una variable global (window.Docx) para usarlo desde scripts clásicos. */
import {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Header,Footer,PageNumber,NumberFormat,TableOfContents,
  FootnoteReferenceRun,ImageRun,Table,TableRow,TableCell,WidthType,BorderStyle,PageBreak,SectionType,LineRuleType,
  ExternalHyperlink,InternalHyperlink,Bookmark,TabStopType,TabStopPosition,LeaderType,VerticalAlign,
  TableLayoutType,ShadingType,Tab,PageOrientation,convertMillimetersToTwip} from 'docx';

window.Docx={Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Header,Footer,PageNumber,NumberFormat,TableOfContents,
  FootnoteReferenceRun,ImageRun,Table,TableRow,TableCell,WidthType,BorderStyle,PageBreak,SectionType,LineRuleType,
  ExternalHyperlink,InternalHyperlink,Bookmark,TabStopType,TabStopPosition,LeaderType,VerticalAlign,
  TableLayoutType,ShadingType,Tab,PageOrientation,convertMillimetersToTwip};
