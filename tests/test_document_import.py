import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from document_import import extract_docx


XML = '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>First</w:t><w:tab/><w:t>line</w:t></w:r></w:p><w:p/>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>Last</w:t><w:br/><w:t>part</w:t></w:r></w:p></w:body></w:document>'''


class DocxImportTests(unittest.TestCase):
    def test_preserves_blocks_tabs_and_breaks(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"sample.docx"
            with ZipFile(path,"w") as archive: archive.writestr("word/document.xml",XML)
            self.assertEqual(extract_docx(path),"First\tline\n\nA\tB\nLast\npart")


if __name__ == "__main__": unittest.main()
