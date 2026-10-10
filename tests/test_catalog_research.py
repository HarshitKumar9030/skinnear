"""Ingredient safety regressions for reviewed public catalog imports."""
import sys
import unittest
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from import_reviewed_catalog import IngredientReader


class IngredientReaderTests(unittest.TestCase):
    def setUp(self):
        self.reader = IngredientReader()

    def test_marketing_paragraph_does_not_replace_full_inci(self):
        page = BeautifulSoup('''<p>Water, glycerin, ceramides, which help support
            skin, restore hydration, and improve suppleness.</p>
            <p>Aqua, Glycerin, Squalane, Panthenol, Sodium Hyaluronate,
            1,2-Hexanediol, Ethylhexylglycerin.</p>''', 'html.parser')
        ingredients = self.reader.read(page)
        self.assertEqual(len(ingredients), 7)
        self.assertIn('1,2-Hexanediol', ingredients)
        self.assertEqual(ingredients[-1], 'Ethylhexylglycerin')

    def test_formula_disclaimer_is_not_an_ingredient(self):
        page = BeautifulSoup('''<p>Water, Glycerin, Panthenol, Squalane,
            Sodium Hyaluronate, Phenoxyethanol. *Please note ingredients
            may change, check your packaging.</p>''', 'html.parser')
        self.assertEqual(self.reader.read(page)[-1], 'Phenoxyethanol')

    def test_partial_function_groups_are_not_complete_lists(self):
        page = BeautifulSoup('''<p>Water, Glycerin, Panthenol, Squalane,
            Ceramide NP, Sodium Hyaluronate</p>''', 'html.parser')
        self.assertEqual(self.reader.read(page, 'byoma-us'), [])

    def test_parentheses_and_numeric_commas_are_preserved(self):
        self.assertEqual(self.reader.split('Water, 1,2-Hexanediol, Oil (Seed, Fruit), Glycerin'),
            ['Water', '1,2-Hexanediol', 'Oil (Seed, Fruit)', 'Glycerin'])


if __name__ == '__main__':
    unittest.main()
