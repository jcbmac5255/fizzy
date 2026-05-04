class AddColumnPositionToCards < ActiveRecord::Migration[8.2]
  def change
    add_column :cards, :column_position, :integer
    add_index :cards, [ :column_id, :column_position ]
  end
end
